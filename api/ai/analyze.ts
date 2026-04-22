import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../../lib/auth';
import { AIFactory } from '../../lib/ai/factory';

// POST /api/ai/analyze
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { babyId, query } = req.body;

    if (!babyId) {
        return res.status(400).json({ message: 'Baby ID is required' });
    }

    try {
        const id = BigInt(babyId);
        if (!(await hasBabyPermission(user.userId, id))) return res.status(403).json({ message: 'Forbidden' });

        // 1. Gather Context Data
        const baby = await prisma.baby.findFirst({
            where: { id: id } // Simplified auth check
        });

        if (!baby) {
            return res.status(404).json({ message: 'Baby not found' });
        }

        // Fetch last 7 days records for context
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [feeding, sleep, growth] = await Promise.all([
            prisma.feedingRecord.findMany({
                where: { babyId: id, time: { gte: sevenDaysAgo } },
                orderBy: { time: 'desc' },
                take: 20
            }),
            prisma.sleepRecord.findMany({
                where: { babyId: id, startTime: { gte: sevenDaysAgo } },
                orderBy: { startTime: 'desc' },
                take: 20
            }),
            prisma.growthRecord.findMany({
                where: { babyId: id, time: { gte: sevenDaysAgo } },
                orderBy: { time: 'desc' },
                take: 5
            })
        ]);

        const babyProfile = {
            name: baby.name,
            gender: baby.gender,
            birthDate: baby.birthDate,
            month: Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
        };

        const records = {
            feeding: JSON.parse(JSON.stringify(feeding, (key, value) => typeof value === 'bigint' ? value.toString() : value)),
            sleep: JSON.parse(JSON.stringify(sleep, (key, value) => typeof value === 'bigint' ? value.toString() : value)),
            growth: JSON.parse(JSON.stringify(growth, (key, value) => typeof value === 'bigint' ? value.toString() : value))
        };

        // 2. Call AI Provider
        const provider = AIFactory.createProvider();
        const result = await provider.analyze({
            babyProfile,
            recentRecords: records,
            query
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error('AI Analysis failed', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
