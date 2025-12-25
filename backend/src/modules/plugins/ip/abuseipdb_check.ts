import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import axios from 'axios';

export class AbuseIPDBPlugin implements OsintPlugin {
    name = "AbuseIPDB Check";
    description = "Check IP reputation against AbuseIPDB database";
    acceptedTypes = ['ip'];
    version = "1.0";
    author = "Nexus Team";
    cost = 'free' as const; // Only requires free key

    async execute(inputNode: Node, config?: any): Promise<ExecutionResult> {
        const ip = JSON.parse(inputNode.data).ip;
        const results: ExecutionResult = { newNodes: [], newLinks: [], logs: [] };

        const apiKey = config?.abuseipdbKey;

        if (!apiKey) {
            results.logs.push("Skipping AbuseIPDB: No API Key provided.");
            return results;
        }

        try {
            results.logs.push(`Querying AbuseIPDB for ${ip}...`);
            const response = await axios.get(`https://api.abuseipdb.com/api/v2/check`, {
                params: { ipAddress: ip, maxAgeInDays: 90 },
                headers: { 'Key': apiKey, 'Accept': 'application/json' }
            });
            const data = response.data.data;

            const reportId = `rep_abuseipdb_${Math.random().toString(36).substr(2, 9)}`;

            const enrichment = {
                risk_score: data.abuseConfidenceScore,
                total_reports: data.totalReports,
                last_report: data.lastReportedAt,
                usage_type: data.usageType,
                domain_assoc: data.domain,
                source: 'abuseipdb'
            };

            results.newNodes.push({
                id: reportId,
                type: 'reputation_data',
                data: JSON.stringify(enrichment),
                x: inputNode.x + 60,
                y: inputNode.y + 60
            });

            results.newLinks.push({
                source: inputNode.id,
                target: reportId
            });

        } catch (err: any) {
            results.logs.push(`AbuseIPDB Request Failed: ${err.response?.data?.error || err.message}`);
        }

        return results;
    }
}
