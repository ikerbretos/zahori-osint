import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import axios from 'axios';

export class HunterPlugin implements OsintPlugin {
    name = "Hunter.io Email Lookup";
    description = "Verify email address and find professional details";
    acceptedTypes = ['email'];
    version = "1.0";
    author = "Nexus Team";
    cost = 'paid' as const;

    async execute(inputNode: Node, config?: any): Promise<ExecutionResult> {
        const email = JSON.parse(inputNode.data).email;
        const results: ExecutionResult = { newNodes: [], newLinks: [], logs: [] };

        const apiKey = config?.hunterKey;

        if (!apiKey) {
            results.logs.push("Skipping Hunter.io: No API Key provided.");
            return results;
        }

        try {
            results.logs.push(`Querying Hunter.io for ${email}...`);
            const response = await axios.get(`https://api.hunter.io/v2/email-verifier`, {
                params: { email, api_key: apiKey }
            });

            if (response.data && response.data.data) {
                const data = response.data.data;

                const infoId = `hunter_${Math.random().toString(36).substr(2, 9)}`;

                const enrichment = {
                    status: data.result,
                    score: data.score,
                    disposable: data.disposable,
                    webmail: data.webmail,
                    mx_records: data.mx_records,
                    source: 'hunter.io'
                };

                results.newNodes.push({
                    id: infoId,
                    type: 'email_data',
                    data: JSON.stringify(enrichment),
                    x: inputNode.x + 50,
                    y: inputNode.y
                });

                results.newLinks.push({ source: inputNode.id, target: infoId });
            }
        } catch (err: any) {
            results.logs.push(`Hunter.io Request Failed: ${err.message}`);
        }

        return results;
    }
}
