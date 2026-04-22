import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';
import { error } from '../lib/utils';

// POST /api/ai/analyze
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return error(res, 'Method Not Allowed', 405);
    }

    const user = await getUserFromRequest(req);
    if (!user) {
        return error(res, 'Unauthorized', 401);
    }

    const { babyId, query } = req.body;

    try {
        let babyProfile = undefined;
        let records = { feeding: [], sleep: [], growth: [] };

        if (babyId) {
            const id = BigInt(babyId);
            if (!(await hasBabyPermission(user.userId, id))) return error(res, 'Forbidden', 403);

            // 1. Gather Context Data
            const baby = await prisma.baby.findFirst({
                where: { id: id }
            });

            if (baby) {
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

                babyProfile = {
                    name: baby.name,
                    gender: baby.gender,
                    birthDate: baby.birthDate,
                    month: Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
                };

                records = {
                    feeding: JSON.parse(JSON.stringify(feeding, (key, value) => typeof value === 'bigint' ? value.toString() : value)),
                    sleep: JSON.parse(JSON.stringify(sleep, (key, value) => typeof value === 'bigint' ? value.toString() : value)),
                    growth: JSON.parse(JSON.stringify(growth, (key, value) => typeof value === 'bigint' ? value.toString() : value))
                };
            }
        }

        // 2. Call AI Provider
        const provider = AIFactory.createProvider();
        const result = await provider.analyze({
            babyProfile,
            recentRecords: records,
            query: babyProfile ? query : `(用户尚未添加宝宝，请提供通用的育儿或接种建议) ${query}`
        });

        return res.status(200).json(result);

    } catch (err) {
        console.error('AI Analyze Error:', err);
        return error(res, 'Internal Server Error', 500);
    }
}
