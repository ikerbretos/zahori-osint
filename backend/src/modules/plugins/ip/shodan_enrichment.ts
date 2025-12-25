import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import axios from 'axios';

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

export class ShodanPlugin implements OsintPlugin {
    name = "Shodan IP Enrichment";
    description = "Gather vulnerability and host information from Shodan";
    acceptedTypes = ['ip'];
    version = "1.0";
    author = "Nexus Team";
    cost = 'paid' as const;

    async execute(inputNode: Node, config?: any): Promise<ExecutionResult> {
        const ip = JSON.parse(inputNode.data).ip;
        const results: ExecutionResult = { newNodes: [], newLinks: [], logs: [] };

        const apiKey = config?.shodanKey;

        if (!apiKey) {
            results.logs.push("Skipping Shodan: No API Key provided.");
            return results;
        }

        try {
            results.logs.push(`Querying Shodan for ${ip}...`);
            const response = await axios.get<ShodanHost>(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`);
            const data = response.data;

            // Update the IP Node with enriched data (simulated by adding a 'same-as' node with detail, 
            // BUT in this new architecture we might want to attach data to the node itself.
            // For now, I'll return a "shodan_report" node linked to the IP)

            const reportId = `rep_shodan_${Math.random().toString(36).substr(2, 9)}`;

            // Extract relevant data
            const enrichment = {
                asn: data.asn,
                isp: data.isp,
                organization: data.org || data.isp,
                country: data.country_name,
                city: data.city,
                lat: data.latitude,
                lon: data.longitude,
                os: data.os,
                ports: data.ports,
                hostnames: data.hostnames,
                vulns: data.vulns,
                source: 'shodan'
            };

            results.newNodes.push({
                id: reportId,
                type: 'shodan_data',
                data: JSON.stringify(enrichment),
                x: inputNode.x + 50,
                y: inputNode.y + 50
            });

            results.newLinks.push({
                source: inputNode.id,
                target: reportId,
                // label: 'enriched_by' // Removed to match schema
            });

            // Optional: Create nodes for Open Ports
            if (data.ports) {
                data.ports.forEach(port => {
                    const portId = `port_${ip}_${port}`;
                    results.newNodes.push({
                        id: portId,
                        type: 'port',
                        data: JSON.stringify({ port, protocol: 'tcp', service: 'unknown' }),
                        x: inputNode.x, // Layout algo will fix this
                        y: inputNode.y
                    });
                    results.newLinks.push({
                        source: inputNode.id,
                        target: portId,
                        // label: 'has_port'
                    });
                });
            }

        } catch (err: any) {
            results.logs.push(`Shodan Request Failed: ${err.response?.data?.error || err.message}`);
        }

        return results;
    }
}
