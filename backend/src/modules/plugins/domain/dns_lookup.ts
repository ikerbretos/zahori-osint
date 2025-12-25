import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolveMx = promisify(dns.resolveMx);
const resolveNs = promisify(dns.resolveNs);
const resolveTxt = promisify(dns.resolveTxt);

export class DnsLookupPlugin implements OsintPlugin {
    name = "Basic DNS Enumeration";
    description = "Resolve A, MX, NS, and TXT records";
    acceptedTypes = ['domain'];
    version = "1.0";
    author = "Nexus Team";
    cost = 'free' as const;

    async execute(inputNode: Node): Promise<ExecutionResult> {
        const domain = JSON.parse(inputNode.data).domain;
        const results: ExecutionResult = { newNodes: [], newLinks: [], logs: [] };

        results.logs.push(`Resolving DNS for ${domain}...`);

        // 1. A Records (IPs)
        try {
            const ips = await resolve4(domain);
            ips.forEach(ip => {
                const ipId = `ip_${ip.replace(/\./g, '_')}`;
                results.newNodes.push({
                    id: ipId,
                    type: 'ip',
                    data: JSON.stringify({ ip, source: 'dns_a_record' }),
                    x: inputNode.x,
                    y: inputNode.y + 100
                });
                results.newLinks.push({ source: inputNode.id, target: ipId });
            });
            results.logs.push(`Found ${ips.length} A records.`);
        } catch (e) { results.logs.push("No A records found."); }

        // 2. MX Records
        try {
            const mx = await resolveMx(domain);
            mx.forEach(m => {
                const mxId = `mx_${m.exchange}`;
                results.newNodes.push({
                    id: mxId,
                    type: 'server',
                    data: JSON.stringify({ hostname: m.exchange, priority: m.priority, type: 'mail_server' }),
                    x: inputNode.x + 50,
                    y: inputNode.y + 100
                });
                results.newLinks.push({ source: inputNode.id, target: mxId });
            });
            results.logs.push(`Found ${mx.length} MX records.`);
        } catch (e) { }

        // 3. NS Records
        try {
            const ns = await resolveNs(domain);
            ns.forEach(n => {
                const nsId = `ns_${n}`;
                results.newNodes.push({
                    id: nsId,
                    type: 'server',
                    data: JSON.stringify({ hostname: n, type: 'nameserver' }),
                    x: inputNode.x - 50,
                    y: inputNode.y + 100
                });
                results.newLinks.push({ source: inputNode.id, target: nsId });
            });
            results.logs.push(`Found ${ns.length} NS records.`);
        } catch (e) { }

        // 4. TXT Records (Just attach as data node, too messy to graph individually?)
        // For now let's skip graphing TXT records to avoid clutter, or maybe just one 'txt_records' node.
        try {
            const txt = await resolveTxt(domain);
            const flatTxt = txt.flat();
            if (flatTxt.length > 0) {
                const txtId = `txt_${domain}`;
                results.newNodes.push({
                    id: txtId,
                    type: 'dns_record',
                    data: JSON.stringify({ records: flatTxt, type: 'TXT' }),
                    x: inputNode.x,
                    y: inputNode.y + 150
                });
                results.newLinks.push({ source: inputNode.id, target: txtId });
            }
        } catch (e) { }

        return results;
    }
}
