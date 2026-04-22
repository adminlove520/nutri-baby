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

    const { babyId, limit = '50', offset = '0' } = req.query;
    if (!babyId) return error(res, 'Baby ID required', 400);

    const bId = BigInt(babyId as string);
    const take = parseInt(limit as string);
    const skip = parseInt(offset as string);

    try {
        // Fetch records with optimized pagination
        const [feeding, sleep, diaper, growth] = await Promise.all([
            prisma.feedingRecord.findMany({ 
                where: { babyId: bId }, 
                orderBy: { time: 'desc' }, 
                take: take,
                include: { creator: { select: { nickname: true, avatarUrl: true } } }
            }),
            prisma.sleepRecord.findMany({ 
                where: { babyId: bId }, 
                orderBy: { startTime: 'desc' }, 
                take: take,
                include: { creator: { select: { nickname: true, avatarUrl: true } } }
            }),
            prisma.diaperRecord.findMany({ 
                where: { babyId: bId }, 
                orderBy: { time: 'desc' }, 
                take: take,
                include: { creator: { select: { nickname: true, avatarUrl: true } } }
            }),
            prisma.growthRecord.findMany({ 
                where: { babyId: bId }, 
                orderBy: { time: 'desc' }, 
                take: take,
                include: { creator: { select: { nickname: true, avatarUrl: true } } }
            })
        ]);

        // Normalize for Timeline: { type, time, data }
        const timelineEntries: any[] = [
            ...feeding.map(r => ({ type: 'feeding', time: r.time, data: r })),
            ...sleep.map(r => ({ type: 'sleep', time: r.startTime, data: r })),
            ...diaper.map(r => ({ type: 'diaper', time: r.time, data: r })),
            ...growth.map(r => ({ type: 'growth', time: r.time, data: r }))
        ];

        // Sort globally by time descending and take only the needed amount
        timelineEntries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        const pagedEntries = timelineEntries.slice(0, take);

        // Calculate total count efficiently
        const [feedingCount, sleepCount, diaperCount, growthCount] = await Promise.all([
            prisma.feedingRecord.count({ where: { babyId: bId } }),
            prisma.sleepRecord.count({ where: { babyId: bId } }),
            prisma.diaperRecord.count({ where: { babyId: bId } }),
            prisma.growthRecord.count({ where: { babyId: bId } })
        ]);
        const total = feedingCount + sleepCount + diaperCount + growthCount;

        return res.status(200).json({
            records: safeJSON(pagedEntries),
            total
        });

    } catch (error) {
        return error(res, 'Internal Server Error', 500);
    }
}
