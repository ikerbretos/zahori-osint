import axios from 'axios';
import dns from 'dns';
import { promisify } from 'util';

// Promisify DNS functions for async/await usage
const resolve4 = promisify(dns.resolve4);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);
const resolveTxt = promisify(dns.resolveTxt);

// Interfaces for specific API responses (Optional but good for type safety)
interface ShodanHost {
    ip_str: string;
    country_name: string;
    city: string;
    asn: string;
    isp: string;
    org: string;
    os: string;
    ports: number[];
    vulns?: string[];
    latitude: number;
    longitude: number;
    hostnames: string[];
}

// Structure for the returned object (Only data, no graph nodes)
interface EnrichmentResult {
    type: string;
    enrichedData: any;
}

/**
 * IP Lookup Module
 * Integrates: Shodan, AbuseIPDB, and IP-API (fallback)
 */
export const ipLookup = async (ip: string, shodanKey?: string, abuseipdbKey?: string, virustotalKey?: string): Promise<EnrichmentResult | null> => {
    try {
        // Base object
        let enrichedData: any = {
            last_update: new Date().toISOString()
        };

        // 1. Shodan Lookup
        if (shodanKey) {
            try {
                console.log(`[OSINT] Querying Shodan for ${ip}...`);
                const response = await axios.get<ShodanHost>(`https://api.shodan.io/shodan/host/${ip}?key=${shodanKey}`);
                const data = response.data;

                // Map Shodan data to flat fields for the Inspector Panel
                Object.assign(enrichedData, {
                    asn: data.asn,
                    isp: data.isp,
                    organization: data.org || data.isp,
                    country: data.country_name,
                    city: data.city,
                    lat: data.latitude,
                    lon: data.longitude,
                    os: data.os,
                    // Convert arrays to strings for text inputs
                    ports: data.ports ? data.ports.join(', ') : '',
                    hostnames: data.hostnames ? data.hostnames.join(', ') : '',
                    vulns: data.vulns ? data.vulns.join(', ') : ''
                });
            } catch (err: any) {
                console.error("Shodan Request Failed:", err.response?.data?.error || err.message);
                // Don't fail the whole request, just log it
            }
        }

        // 2. AbuseIPDB Lookup
        if (abuseipdbKey) {
            try {
                console.log(`[OSINT] Querying AbuseIPDB for ${ip}...`);
                const response = await axios.get(`https://api.abuseipdb.com/api/v2/check`, {
                    params: { ipAddress: ip, maxAgeInDays: 90 },
                    headers: { 'Key': abuseipdbKey, 'Accept': 'application/json' }
                });
                const data = response.data.data;
                Object.assign(enrichedData, {
                    risk_score: `${data.abuseConfidenceScore}%`,
                    total_reports: data.totalReports,
                    last_report: data.lastReportedAt,
                    usage_type: data.usageType,
                    domain_assoc: data.domain
                });
            } catch (err: any) {
                console.error("AbuseIPDB Request Failed:", err.response?.data?.error || err.message);
            }
        }

        // 3. Public API Fallback (IP-API)
        // Only run if we lack basic geo data
        if (!enrichedData.country) {
            console.log(`[OSINT] Using Public API fallback for ${ip}...`);
            try {
                const response = await axios.get(`http://ip-api.com/json/${ip}`);
                Object.assign(enrichedData, {
                    isp: response.data.isp,
                    organization: response.data.org || response.data.isp,
                    country: response.data.country,
                    city: response.data.city,
                    lat: response.data.lat,
                    lon: response.data.lon,
                    timezone: response.data.timezone,
                    asn: response.data.as
                });
            } catch (e) {
                console.error("Public API Fallback Failed");
            }
        }


        // 4. VirusTotal Reputation
        if (virustotalKey) {
            const vtData = await virusTotalLookup(ip, 'ip', virustotalKey);
            if (vtData) {
                Object.assign(enrichedData, {
                    vt_reputation: vtData.reputation,
                    vt_malicious: vtData.malicious,
                    vt_harmless: vtData.harmless
                });
            }
        }

        return {
            type: 'ip_info',
            enrichedData
        };
    } catch (error) {
        console.error('IP Lookup error:', error);
        return null;
    }
};

/**
 * DNS Lookup Module
 * Integrates: Native DNS resolution and RDAP/WHOIS
 */
export const dnsLookup = async (domain: string): Promise<EnrichmentResult | null> => {
    try {
        console.log(`[OSINT] Querying DNS for ${domain}...`);

        const enrichedData: any = {
            domain,
            last_update: new Date().toISOString()
        };

        // 1. Resolve A Records (IPs)
        try {
            const ips = await resolve4(domain);
            enrichedData.ips = ips.join(', ');
        } catch (e) {
            // Ignore errors (no record found)
        }

        // 2. Resolve MX Records (Mail Servers)
        try {
            const mx = await resolveMx(domain);
            // Format: "mail.google.com (10)"
            enrichedData.mx_records = mx.map(m => `${m.exchange} (${m.priority})`).join(', ');
        } catch (e) {
        }

        // 3. Resolve NS Records (Name Servers)
        try {
            const ns = await resolveNs(domain);
            enrichedData.nameservers = ns.join(', ');
        } catch (e) {
        }

        // 4. Resolve TXT Records (SPF, Verification tokens)
        try {
            const txt = await resolveTxt(domain);
            const flatTxt = txt.flat();
            if (flatTxt.length > 0) {
                // Join with pipe separator for readability in text field
                enrichedData.txt_records = flatTxt.join(' | ');
            }
        } catch (e) {
        }

        // 5. RDAP / WHOIS Lookup (Free)
        try {
            console.log(`[OSINT] Querying RDAP for ${domain}...`);
            const rdapResponse = await axios.get(`https://rdap.org/domain/${domain}`);
            if (rdapResponse.data) {
                const data = rdapResponse.data;
                // Try to extract Registrar Name safely
                const registrarFn = data.entities?.[0]?.vcardArray?.[1]?.find((x: any) => x[0] === 'fn');
                enrichedData.registrar = registrarFn ? registrarFn[3] : 'Unknown';

                // Extract events (creation, expiry)
                const events = data.events || [];
                const creation = events.find((e: any) => e.eventAction === 'registration');
                const expiry = events.find((e: any) => e.eventAction === 'expiration');

                if (creation) enrichedData.creation_date = creation.eventDate;
                if (expiry) enrichedData.expiry_date = expiry.eventDate;

                // Domain Status
                if (data.status) enrichedData.status = data.status.join(', ');
            }
        } catch (e) {
            console.log(`RDAP lookup failed for ${domain}`);
        }


        // 6. Subdomain Enumeration (crt.sh)
        try {
            const subdomains = await crtshLookup(domain);
            if (subdomains.length > 0) {
                enrichedData.subdomains = subdomains.join(', ');
                enrichedData.subdomain_count = subdomains.length;
            }
        } catch (e) { }

        return {
            type: 'dns_info',
            enrichedData
        };
    } catch (error) {
        console.error('DNS Lookup error:', error);
        return null;
    }
};

/**
 * Email Lookup Module
 * Integrates: Hunter.io
 */
export const emailLookup = async (email: string, hunterKey?: string): Promise<EnrichmentResult | null> => {
    try {
        console.log(`[OSINT] Enriching Email: ${email}...`);
        const [user, domain] = email.split('@');

        let enrichedData: any = {
            email,
            user,
            domain,
            status: 'Pending Analysis',
            last_update: new Date().toISOString()
        };

        if (hunterKey) {
            try {
                console.log(`[OSINT] Querying Hunter.io for ${email}...`);
                const response = await axios.get(`https://api.hunter.io/v2/email-verifier`, {
                    params: { email, api_key: hunterKey }
                });

                if (response.data && response.data.data) {
                    const data = response.data.data;
                    Object.assign(enrichedData, {
                        status: data.result === 'deliverable' ? 'Valid' : data.result,
                        score: `${data.score}%`,
                        provider: data.gibberish ? 'Unknown/Gibberish' : 'Standard',
                        disposable: data.disposable ? 'Yes' : 'No',
                        webmail: data.webmail ? 'Yes' : 'No',
                        mx_records: data.mx_records ? 'Found' : 'Missing'
                    });
                }
            } catch (err: any) {
                console.error("Hunter.io Request Failed:", err.message);
                enrichedData.status = "API Error";
            }
        } else {
            enrichedData.status = "No API Key Provided";
        }

        return {
            type: 'email_info',
            enrichedData
        };
    } catch (error) {
        console.error('Email Lookup error:', error);
        return null;
    }
};

/**
 * Phone Lookup Module
 * Integrates: Numverify
 */
export const phoneLookup = async (phone: string, numverifyKey?: string): Promise<EnrichmentResult | null> => {
    try {
        console.log(`[OSINT] Enriching Phone: ${phone}...`);

        let enrichedData: any = {
            phone,
            last_update: new Date().toISOString()
        };

        // Standardize phone for basic local check (remove + and spaces)
        const cleanPhone = phone.replace(/[+\s]/g, '');
        // Basic Fallback Logic (always run this to ensure minimum data)
        const countryCode = phone.startsWith('+') ? phone.substring(0, 4) : '?'; // Rough guess
        Object.assign(enrichedData, {
            country_code: countryCode,
            carrier: 'Unknown (API Limit/Error)',
            line_type: 'Unknown',
            valid: 'Unknown'
        });

        if (numverifyKey) {
            try {
                console.log(`[OSINT] Querying Numverify for ${phone}...`);
                const response = await axios.get(`http://apilayer.net/api/validate`, {
                    params: {
                        access_key: numverifyKey,
                        number: phone,
                        format: 1
                    }
                });

                if (response.data) {
                    if (response.data.success === false) {
                        console.error("Numverify API Error:", response.data.error?.type);
                        enrichedData.carrier = `API Error: ${response.data.error?.type}`;
                    } else if (response.data.valid) {
                        const data = response.data;
                        Object.assign(enrichedData, {
                            country_code: data.country_prefix,
                            country: data.country_name,
                            location: data.location,
                            carrier: data.carrier,
                            line_type: data.line_type,
                            valid: 'Yes'
                        });
                    } else {
                        console.log(`Numverify returned invalid number.`);
                        enrichedData.valid = 'No/Invalid';
                    }
                }
            } catch (err: any) {
                console.error("Numverify Request Failed:", err.message);
                enrichedData.carrier = "Request Failed";
            }
        } else {
            enrichedData.carrier = "No API Key";
        }

        return {
            type: 'phone_info',
            enrichedData
        };
    } catch (error) {
        console.error('Phone Lookup error:', error);
        return null;
    }
};

/**
 * Subdomain Lookup (crt.sh)
 * Free, no API key required.
 */
export const crtshLookup = async (domain: string): Promise<string[]> => {
    try {
        console.log(`[OSINT] Querying crt.sh for ${domain}...`);
        const response = await axios.get(`https://crt.sh/?q=%.${domain}&output=json`);
        if (response.data && Array.isArray(response.data)) {
            // Extract unique common names
            const names = response.data
                .map((entry: any) => entry.name_value)
                .join('\n')
                .split('\n');
            const unique = [...new Set(names)].filter(n => n !== domain && !n.includes('*'));
            return unique.slice(0, 50); // Limit to 50 to avoid clutter
        }
        return [];
    } catch (error) {
        console.error('crt.sh Lookup error:', error);
        return [];
    }
};

/**
 * VirusTotal Lookup
 * Supports IP and Domain.
 */
export const virusTotalLookup = async (value: string, type: 'ip' | 'domain', apiKey?: string): Promise<any> => {
    if (!apiKey) return null;

    try {
        console.log(`[OSINT] Querying VirusTotal for ${value} (${type})...`);
        const endpoint = type === 'ip' ? `ip_addresses/${value}` : `domains/${value}`;
        const response = await axios.get(`https://www.virustotal.com/api/v3/${endpoint}`, {
            headers: { 'x-apikey': apiKey }
        });

        if (response.data && response.data.data) {
            const attr = response.data.data.attributes;
            const stats = attr.last_analysis_stats;

            return {
                reputation: attr.reputation,
                malicious: stats.malicious,
                suspicious: stats.suspicious,
                harmless: stats.harmless,
                last_analysis: new Date(attr.last_analysis_date * 1000).toISOString(),
                whois: attr.whois ? 'Yes (Cached)' : 'No'
            };
        }
        return null;
    } catch (error: any) {
        console.error('VirusTotal Lookup error:', error.message);
        return { error: 'VT Request Failed' };
    }
};
