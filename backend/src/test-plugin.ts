import { ModuleManager } from './modules/core/ModuleManager';
import { CrtShPlugin } from './modules/plugins/domain/crtsh_subdomains';
import { ShodanPlugin } from './modules/plugins/ip/shodan_enrichment';
import { DnsLookupPlugin } from './modules/plugins/domain/dns_lookup';
import { Node } from '@prisma/client';

async function test() {
    console.log("Starting Plugin System Test...");

    const manager = new ModuleManager();
    const crtPlugin = new CrtShPlugin();

    manager.registerPlugin(new CrtShPlugin());
    manager.registerPlugin(new ShodanPlugin());
    manager.registerPlugin(new DnsLookupPlugin());

    // Mock Node
    const inputNode: any = {
        id: 'test-node-1',
        type: 'domain',
        data: JSON.stringify({ domain: 'tesla.com' }), // Using a real domain to get results
        x: 0,
        y: 0
    };

    const domainData = JSON.parse(inputNode.data);
    console.log(`Testing Crt.sh on ${domainData.domain}...`);
    await manager.executePlugin('CRT.sh Subdomain Enumeration', inputNode);

    console.log(`Testing DNS Lookup on ${domainData.domain}...`);
    // Mock run without output check for brevity
    const dnsResults = await manager.executePlugin('Basic DNS Enumeration', inputNode);
    console.log(`- DNS found ${dnsResults.newNodes.length} records`);

    // Mock IP Node
    const ipNode: any = {
        id: 'test-ip-1',
        type: 'ip',
        data: JSON.stringify({ ip: '8.8.8.8' }),
        x: 0,
        y: 0
    };

    // Simulate config
    const config = { shodanKey: 'TEST_KEY' };
    console.log(`Testing Shodan on 8.8.8.8 (Mock Key)...`);
    const shodanResults = await manager.executePlugin('Shodan IP Enrichment', ipNode, config);
    console.log(`- Shodan logs:`, shodanResults.logs);
}

test().catch(console.error);
