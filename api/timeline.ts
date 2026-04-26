import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';
import { error } from '../lib/utils';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return error(res, 'Method Not Allowed', 405);

    const user = await getUserFromRequest(req);
    if (!user) return error(res, 'Unauthorized', 401);

    const { babyId, limit = '50' } = req.query;
    if (!babyId) return error(res, 'Baby ID required', 400);

    const bId = BigInt(babyId as string);
    const take = parseInt(limit as string);

    try {
        const [feeding, sleep, diaper, growth, medication, health] = await Promise.all([
            prisma.feedingRecord.findMany({
                where: { babyId: bId },
                orderBy: { time: 'desc' },
                take,
                select: {
                    id: true, babyId: true, time: true, feedingType: true,
                    amount: true, duration: true, detail: true,
                    createdBy: true, createdByName: true, createdByAvatar: true,
                    creator: { select: { nickname: true, avatarUrl: true } }
                }
            }),
            prisma.sleepRecord.findMany({
                where: { babyId: bId },
                orderBy: { startTime: 'desc' },
                take,
                select: {
                    id: true, babyId: true, startTime: true, endTime: true,
                    duration: true, type: true,
                    createdBy: true, createdByName: true, createdByAvatar: true,
                    creator: { select: { nickname: true, avatarUrl: true } }
                }
            }),
            prisma.diaperRecord.findMany({
                where: { babyId: bId },
                orderBy: { time: 'desc' },
                take,
                select: {
                    id: true, babyId: true, time: true, type: true,
                    poopColor: true, poopTexture: true, note: true,
                    createdBy: true, createdByName: true, createdByAvatar: true,
                    creator: { select: { nickname: true, avatarUrl: true } }
                }
            }),
            prisma.growthRecord.findMany({
                where: { babyId: bId },
                orderBy: { time: 'desc' },
                take,
                select: {
                    id: true, babyId: true, time: true,
                    height: true, weight: true, headCircumference: true, note: true,
                    createdBy: true, createdByName: true, createdByAvatar: true,
                    creator: { select: { nickname: true, avatarUrl: true } }
                }
            }),
            prisma.medicationRecord.findMany({
                where: { babyId: bId },
                orderBy: { time: 'desc' },
                take,
                select: {
                    id: true, babyId: true, time: true, name: true, dosage: true, notes: true
                }
            }),
            prisma.healthRecord.findMany({
                where: { babyId: bId },
                orderBy: { time: 'desc' },
                take,
                select: {
                    id: true, babyId: true, time: true, type: true, value: true, symptoms: true, notes: true
                }
            })
        ]);

        const timelineEntries: any[] = [
            ...feeding.map(r => ({ type: 'feeding', time: r.time, data: r })),
            ...sleep.map(r => ({ type: 'sleep', time: r.startTime, data: r })),
            ...diaper.map(r => ({ type: 'diaper', time: r.time, data: r })),
            ...growth.map(r => ({ type: 'growth', time: r.time, data: r })),
            ...medication.map(r => ({ type: 'medication', time: r.time, data: r })),
            ...health.map(r => ({ type: 'health', time: r.time, data: r }))
        ];

        timelineEntries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        const pagedEntries = timelineEntries.slice(0, take);

        // 优化：使用 aggregate._count 替代单独的 count 查询，减少数据库往返
        const countResults = await Promise.all([
            prisma.feedingRecord.aggregate({ where: { babyId: bId }, _count: true }),
            prisma.sleepRecord.aggregate({ where: { babyId: bId }, _count: true }),
            prisma.diaperRecord.aggregate({ where: { babyId: bId }, _count: true }),
            prisma.growthRecord.aggregate({ where: { babyId: bId }, _count: true }),
            prisma.medicationRecord.aggregate({ where: { babyId: bId }, _count: true }),
            prisma.healthRecord.aggregate({ where: { babyId: bId }, _count: true })
        ]);
        const total = countResults.reduce((sum, r) => sum + (r._count as number), 0);

        return res.status(200).json({
            records: safeJSON(pagedEntries),
            total
        });

    } catch (err: any) {
        console.error('[Timeline] Error:', err?.message);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
