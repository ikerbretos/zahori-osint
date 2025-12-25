import { Node, Link } from '@prisma/client';

export interface OsintPlugin {
    // Metadata
    name: string;
    description: string;
    version: string;
    author: string;

    // What type of nodes this plugin accepts (e.g. ['ip', 'domain'])
    acceptedTypes: string[];

    // Estimated cost
    cost?: 'free' | 'paid';

    // Main execution function
    execute(inputNode: Node, config?: any): Promise<ExecutionResult>;
}

export interface ExecutionResult {
    newNodes: Partial<Node>[]; // Discovered nodes
    newLinks: Partial<Link>[]; // Discovered connections
    logs: string[];            // Execution logs
}
