import { Node } from '@prisma/client';
import { OsintPlugin, ExecutionResult } from './PluginInterface';

export class ModuleManager {
    private plugins: OsintPlugin[] = [];

    constructor() {
        // In the future, we could auto-load plugins from a directory here
    }

    registerPlugin(plugin: OsintPlugin) {
        this.plugins.push(plugin);
        console.log(`[ModuleManager] Registered plugin: ${plugin.name}`);
    }

    getPluginsForType(nodeType: string): OsintPlugin[] {
        return this.plugins.filter(p => p.acceptedTypes.includes(nodeType));
    }

    async executePlugin(pluginName: string, inputNode: Node, config?: any): Promise<ExecutionResult> {
        const plugin = this.plugins.find(p => p.name === pluginName);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginName}`);
        }

        console.log(`[ModuleManager] Executing ${plugin.name} on node ${inputNode.id}...`);
        return await plugin.execute(inputNode, config);
    }
}
