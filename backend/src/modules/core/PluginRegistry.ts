import { ModuleManager } from './ModuleManager';
import { ShodanPlugin } from '../plugins/ip/shodan_enrichment';
import { AbuseIPDBPlugin } from '../plugins/ip/abuseipdb_check';
import { IpApiPlugin } from '../plugins/ip/ip_api_lookup';
import { VirusTotalPlugin } from '../plugins/ip/virustotal_plugin';
import { DnsLookupPlugin } from '../plugins/domain/dns_lookup';
import { CrtShPlugin } from '../plugins/domain/crtsh_subdomains';
import { HunterPlugin } from '../plugins/email/hunter_verify';
import { NumverifyPlugin } from '../plugins/phone/numverify_lookup';

const manager = new ModuleManager();

// Register IP Plugins
manager.registerPlugin(new ShodanPlugin());
manager.registerPlugin(new AbuseIPDBPlugin());
manager.registerPlugin(new IpApiPlugin());
manager.registerPlugin(new VirusTotalPlugin());

// Register Domain Plugins
manager.registerPlugin(new DnsLookupPlugin());
manager.registerPlugin(new CrtShPlugin());
// VirusTotal is already registered above and handles both types if implemented correctly, 
// but since we instantiate new plugins, let's just rely on the one instance if it checks type, 
// OR register separate instances if they are stateless. 
// However, the module manager matches by name usually. 
// Let's check VirusTotalPlugin implementation... it handles both.
// If ModuleManager.getPluginsForType returns all matches, one instance is enough if it supports multiple types.
// The current VirusTotalPlugin says acceptedTypes: ['ip', 'domain'].
// So one registration is enough!

// Register Email Plugins
manager.registerPlugin(new HunterPlugin());

// Register Phone Plugins
manager.registerPlugin(new NumverifyPlugin());

// Register ID Plugins (Python)
import { SherlockPlugin } from '../plugins/identity/sherlock_plugin';
manager.registerPlugin(new SherlockPlugin());

export const pluginManager = manager;
