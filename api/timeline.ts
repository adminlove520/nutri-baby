import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId, limit = '50', offset = '0' } = req.query;
    if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

    const bId = BigInt(babyId as string);
    const take = parseInt(limit as string);
    const skip = parseInt(offset as string);

    try {
        // Fetch all types of records
        // For Timeline, we need to normalize them or just fetch and combine
        const [feeding, sleep, diaper, growth] = await Promise.all([
            prisma.feedingRecord.findMany({ 
                where: { babyId: bId }, 
                orderBy: { time: 'desc' }, 
                take: take + skip,
                include: { creator: { select: { nickname: true, avatarUrl: true } } }
            }),
            prisma.sleepRecord.findMany({ 
                where: { babyId: bId }, 
                orderBy: { startTime: 'desc' }, 
                take: take + skip,
                include: { creator: { select: { nickname: true, avatarUrl: true } } }
            }),
            prisma.diaperRecord.findMany({ 
                where: { babyId: bId }, 
                orderBy: { time: 'desc' }, 
                take: take + skip,
                include: { creator: { select: { nickname: true, avatarUrl: true } } }
            }),
            prisma.growthRecord.findMany({ 
                where: { babyId: bId }, 
                orderBy: { time: 'desc' }, 
                take: take + skip,
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

        // Sort globally by time descending
        timelineEntries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        // Slice for pagination
        const pagedEntries = timelineEntries.slice(skip, skip + take);

        return res.status(200).json({
            records: safeJSON(pagedEntries),
            total: timelineEntries.length
        });

    } catch (error) {
        console.error('Timeline API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
