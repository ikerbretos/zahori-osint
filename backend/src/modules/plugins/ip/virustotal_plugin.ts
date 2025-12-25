import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import axios from 'axios';

export class VirusTotalPlugin implements OsintPlugin {
    name = "VirusTotal Reputation";
    description = "Check reputation of IP or Domain on VirusTotal";
    acceptedTypes = ['ip', 'domain'];
    version = "1.0";
    author = "Nexus Team";
    cost = 'free' as const; // Free API tier exists

    async execute(inputNode: Node, config?: any): Promise<ExecutionResult> {
        const data = JSON.parse(inputNode.data);
        const value = inputNode.type === 'ip' ? data.ip : data.domain;
        const type = inputNode.type === 'ip' ? 'ip_addresses' : 'domains';

        const results: ExecutionResult = { newNodes: [], newLinks: [], logs: [] };

        const apiKey = config?.virustotalKey;

        if (!apiKey) {
            results.logs.push("Skipping VirusTotal: No API Key provided.");
            return results;
        }

        try {
            results.logs.push(`Querying VirusTotal for ${value} (${inputNode.type})...`);
            const endpoint = `${type}/${value}`;

            const response = await axios.get(`https://www.virustotal.com/api/v3/${endpoint}`, {
                headers: { 'x-apikey': apiKey }
            });

            if (response.data && response.data.data) {
                const attr = response.data.data.attributes;
                const stats = attr.last_analysis_stats;

                const reportId = `rep_vt_${Math.random().toString(36).substr(2, 9)}`;

                const enrichment = {
                    reputation: attr.reputation,
                    malicious: stats.malicious,
                    suspicious: stats.suspicious,
                    harmless: stats.harmless,
                    last_analysis: new Date(attr.last_analysis_date * 1000).toISOString(),
                    source: 'virustotal'
                };

                results.newNodes.push({
                    id: reportId,
                    type: 'vt_report',
                    data: JSON.stringify(enrichment),
                    x: inputNode.x - 50,
                    y: inputNode.y + 50
                });

                results.newLinks.push({
                    source: inputNode.id,
                    target: reportId
                });
            }

        } catch (error: any) {
            results.logs.push(`VirusTotal Request Failed: ${error.message}`);
        }

        return results;
    }
}
