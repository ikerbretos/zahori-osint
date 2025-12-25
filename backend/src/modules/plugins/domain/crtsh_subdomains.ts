import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import axios from 'axios';

export class CrtShPlugin implements OsintPlugin {
    name = "CRT.sh Subdomain Enumeration";
    description = "Find subdomains using SSL certificate transparency logs via crt.sh";
    acceptedTypes = ['domain'];
    version = "1.0";
    author = "Nexus Team";
    cost = 'free' as const;

    async execute(inputNode: Node): Promise<ExecutionResult> {
        const domain = JSON.parse(inputNode.data).domain; // Assuming node.data is a JSON string containing { domain: "example.com" }
        const results: ExecutionResult = { newNodes: [], newLinks: [], logs: [] };

        if (!domain) {
            results.logs.push("Error: Input node does not contain a domain field in data.");
            return results;
        }

        try {
            results.logs.push(`Querying crt.sh for ${domain}...`);
            const response = await axios.get(`https://crt.sh/?q=%.${domain}&output=json`);

            if (response.data && Array.isArray(response.data)) {
                const names = response.data
                    .map((entry: any) => entry.name_value)
                    .join('\n')
                    .split('\n');
                const uniqueSubdomains = [...new Set(names)].filter(n => n !== domain && !n.includes('*'));

                results.logs.push(`Found ${uniqueSubdomains.length} unique subdomains.`);

                // Limit to avoid graph explosion, user can configure this later
                const limitedSubdomains = uniqueSubdomains.slice(0, 50);

                limitedSubdomains.forEach((sub: string) => {
                    // 1. Create the node
                    // We use a temporary ID, the database or graph manager handles real IDs.
                    // But we need to link it.
                    const newNodeId = `auto_${Math.random().toString(36).substr(2, 9)}`;

                    // Check if it's strictly a subdomain or could be related
                    results.newNodes.push({
                        id: newNodeId,
                        type: 'domain',
                        data: JSON.stringify({ domain: sub, source: 'crt.sh' }),
                        x: inputNode.x + (Math.random() * 200 - 100),
                        y: inputNode.y + 100
                    });

                    // 2. Create the link
                    results.newLinks.push({
                        source: inputNode.id,
                        target: newNodeId
                    });
                });
            } else {
                results.logs.push("No data found or invalid response format.");
            }

        } catch (error: any) {
            results.logs.push(`Error executing crt.sh lookup: ${error.message}`);
        }

        return results;
    }
}
