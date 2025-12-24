import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ipLookup, dnsLookup, emailLookup, phoneLookup } from './modules/osint';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Cases
app.get('/api/cases', async (req, res) => {
    const cases = await prisma.case.findMany({
        include: { _count: { select: { nodes: true, links: true } } }
    });
    res.json(cases);
});

app.post('/api/cases', async (req, res) => {
    const { name, description } = req.body;
    const newCase = await prisma.case.create({
        data: { name, description }
    });
    res.json(newCase);
});

app.get('/api/cases/:id', async (req, res) => {
    const { id } = req.params;
    const caseData = await prisma.case.findUnique({
        where: { id },
        include: { nodes: true, links: true }
    });
    res.json(caseData);
});

// Update Case Graph
app.post('/api/cases/:id/graph', async (req, res) => {
    const { id } = req.params;
    const { nodes, links } = req.body;

    await prisma.$transaction([
        prisma.node.deleteMany({ where: { caseId: id } }),
        prisma.link.deleteMany({ where: { caseId: id } }),
        prisma.node.createMany({
            data: nodes.map((n: any) => ({
                id: n.id,
                type: n.type,
                data: JSON.stringify(n.data),
                notes: n.notes || '',
                x: n.x,
                y: n.y,
                caseId: id
            }))
        }),
        prisma.link.createMany({
            data: links.map((l: any) => ({
                id: l.id,
                source: l.source,
                target: l.target,
                caseId: id
            }))
        })
    ]);

    res.json({ success: true });
});

// OSINT Enrichment
app.post('/api/enrich', async (req, res) => {
    const { nodeId, type, searchValue, apiKeys } = req.body;
    let result = null;

    console.log(`[API] Enrichment request for type: ${type}, value: ${searchValue}`);

    if (type === 'ip') {
        result = await ipLookup(searchValue, apiKeys?.shodan, apiKeys?.abuseipdb, apiKeys?.virustotal);
    } else if (type === 'domain') {
        result = await dnsLookup(searchValue);
    } else if (type === 'email') {
        result = await emailLookup(searchValue, apiKeys?.hunter);
    } else if (type === 'phone') {
        result = await phoneLookup(searchValue, apiKeys?.numverify);
    }

    res.json({ success: !!result, result });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
