import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';

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

    try {
        let babyProfile = undefined;
        let records = { feeding: [], sleep: [], growth: [] };

        if (babyId && babyId !== 'null' && babyId !== 'undefined') {
            const id = BigInt(babyId.toString());
            
            // Permissions check
            const hasPermission = await hasBabyPermission(user.userId, id);
            if (hasPermission) {
                // 1. Gather Context Data
                const baby = await prisma.baby.findUnique({
                    where: { id: id }
                });

                if (baby) {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                    const [feeding, sleep, growth] = await Promise.all([
                        prisma.feedingRecord.findMany({
                            where: { babyId: id, time: { gte: sevenDaysAgo } },
                            orderBy: { time: 'desc' },
                            take: 10
                        }),
                        prisma.sleepRecord.findMany({
                            where: { babyId: id, startTime: { gte: sevenDaysAgo } },
                            orderBy: { startTime: 'desc' },
                            take: 10
                        }),
                        prisma.growthRecord.findMany({
                            where: { babyId: id, time: { gte: sevenDaysAgo } },
                            orderBy: { time: 'desc' },
                            take: 5
                        })
                    ]);

                    babyProfile = {
                        name: baby.name,
                        gender: baby.gender,
                        birthDate: baby.birthDate,
                        month: Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
                    };

                    // Serialize records for AI
                    const serialize = (data: any) => JSON.parse(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v));
                    records = {
                        feeding: serialize(feeding),
                        sleep: serialize(sleep),
                        growth: serialize(growth)
                    };
                }
            }
        }

        // 2. Call AI Provider
        const provider = AIFactory.createProvider();
        const result = await provider.analyze({
            babyProfile,
            recentRecords: records,
            query: babyProfile ? query : `(用户尚未添加宝宝或未选择宝宝，请提供通用的育儿或接种建议) ${query || ''}`
        });

        // Ensure result doesn't contain BigInts (AI should return plain objects anyway)
        return res.status(200).json(result);

    } catch (err: any) {
        console.error('AI Analyze Error:', err);
        return res.status(500).json({ 
            message: 'Internal Server Error', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
}
