import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import { PythonWorker } from '../../core/PythonWorker';

export class SherlockPlugin implements OsintPlugin {
    name = 'Sherlock';
    description = 'Búsqueda de nombres de usuario en redes sociales (Python Engine)';
    version = '1.0.0';
    author = 'Sherlock Project (Wrapped)';
    acceptedTypes = ['identity']; // 'identity' maps to username
    cost: 'free' | 'paid' = 'free';

    async execute(inputNode: Node, config?: any): Promise<ExecutionResult> {
        const username = inputNode.data ? JSON.parse(inputNode.data as string).username || JSON.parse(inputNode.data as string).handle : null;

        if (!username) {
            throw new Error("No username/handle found in node data");
        }

        const worker = new PythonWorker();
        // Sherlock args: --timeout 5 --print-found <username>
        // We limit timeout per site to 5s to be faster. 
        // We use --print-found to only get hits.
        const result = await worker.executeScript('sherlock/sherlock/sherlock.py', [
            username,
            '--timeout', '5',
            '--print-found',
            '--no-color'
        ]);

        if (!result.success) {
            // Sherlock might return non-zero if it fails some sites, but we want the stdout.
            // If error is catastrophic, throw.
            if (result.error && !result.stdout) {
                throw new Error(`Sherlock failed: ${result.error || result.stderr}`);
            }
        }

        // Parse stdout
        // Output format is usually:
        // [*] Checking username...
        // [+] Service: URL

        const lines = result.stdout.split('\n');
        const newNodes: any[] = [];
        const newLinks: any[] = [];
        const logs: string[] = [];

        lines.forEach(line => {
            if (line.includes('[+]')) {
                // Found!
                // Example: [+] Instagram: https://www.instagram.com/username
                const parts = line.split(': ');
                if (parts.length >= 2) {
                    const serviceName = parts[0].replace('[+]', '').trim();
                    const url = parts.slice(1).join(': ').trim();

                    const nodeId = `url_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

                    newNodes.push({
                        id: nodeId,
                        type: 'url',
                        data: { url, title: `${serviceName} Profile`, domain: new URL(url).hostname },
                        x: inputNode.x + (Math.random() - 0.5) * 200,
                        y: inputNode.y + 100 + (Math.random() * 100)
                    });

                    newLinks.push({
                        id: `L_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        source: inputNode.id,
                        target: nodeId
                    });

                    logs.push(`Found profile on ${serviceName}: ${url}`);
                }
            }
        });

        if (newNodes.length === 0) {
            logs.push("No matches found by Sherlock.");
        }

        return { newNodes, newLinks, logs };
    }
}
