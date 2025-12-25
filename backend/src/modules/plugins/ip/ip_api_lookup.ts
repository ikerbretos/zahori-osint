import { OsintPlugin, ExecutionResult } from '../../core/PluginInterface';
import { Node } from '@prisma/client';
import axios from 'axios';

export class IpApiPlugin implements OsintPlugin {
    name = "IP-API Geolocation";
    description = "Basic geolocation and ISP info using IP-API (Free)";
    acceptedTypes = ['ip'];
    version = "1.0";
    author = "Nexus Team";
    cost = 'free' as const;

    async execute(inputNode: Node): Promise<ExecutionResult> {
        const ip = JSON.parse(inputNode.data).ip;
        const results: ExecutionResult = { newNodes: [], newLinks: [], logs: [] };

        try {
            results.logs.push(`Querying IP-API for ${ip}...`);
            const response = await axios.get(`http://ip-api.com/json/${ip}`);
            const data = response.data;

            if (data.status === 'fail') {
                results.logs.push(`IP-API failed: ${data.message}`);
                return results;
            }

            const infoId = `info_ipapi_${Math.random().toString(36).substr(2, 9)}`;

            const enrichment = {
                isp: data.isp,
                organization: data.org || data.isp,
                country: data.country,
                city: data.city,
                lat: data.lat,
                lon: data.lon,
                timezone: data.timezone,
                asn: data.as,
                source: 'ip-api'
            };

            results.newNodes.push({
                id: infoId,
                type: 'geo_data',
                data: JSON.stringify(enrichment),
                x: inputNode.x + 40,
                y: inputNode.y + 40
            });

            results.newLinks.push({
                source: inputNode.id,
                target: infoId
            });

        } catch (e: any) {
            results.logs.push(`IP-API Request Failed: ${e.message}`);
        }

        return results;
    }
}
