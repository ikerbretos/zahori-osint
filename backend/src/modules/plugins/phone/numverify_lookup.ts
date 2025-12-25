import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import axios from 'axios';

export class NumverifyPlugin implements OsintPlugin {
    name = "Numverify Phone Lookup";
    description = "Validate phone number and get carrier/location info";
    acceptedTypes = ['phone'];
    version = "1.0";
    author = "Nexus Team";
    cost = 'free' as const;

    async execute(inputNode: Node, config?: any): Promise<ExecutionResult> {
        const phone = JSON.parse(inputNode.data).phone;
        const results: ExecutionResult = { newNodes: [], newLinks: [], logs: [] };

        const apiKey = config?.numverifyKey;

        if (!apiKey) {
            results.logs.push("Skipping Numverify: No API Key provided.");
            return results;
        }

        try {
            results.logs.push(`Querying Numverify for ${phone}...`);
            const response = await axios.get(`http://apilayer.net/api/validate`, {
                params: {
                    access_key: apiKey,
                    number: phone,
                    format: 1
                }
            });

            if (response.data && response.data.valid) {
                const data = response.data;
                const infoId = `numverify_${Math.random().toString(36).substr(2, 9)}`;

                const enrichment = {
                    country: data.country_name,
                    location: data.location,
                    carrier: data.carrier,
                    line_type: data.line_type,
                    source: 'numverify'
                };

                results.newNodes.push({
                    id: infoId,
                    type: 'phone_data',
                    data: JSON.stringify(enrichment),
                    x: inputNode.x + 50,
                    y: inputNode.y
                });

                results.newLinks.push({ source: inputNode.id, target: infoId });
            } else if (response.data.error) {
                results.logs.push(`Numverify API Error: ${response.data.error.type}`);
            }

        } catch (err: any) {
            results.logs.push(`Numverify Request Failed: ${err.message}`);
        }

        return results;
    }
}
