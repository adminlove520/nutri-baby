import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest } from '../../lib/auth';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : (typeof value === 'number' ? parseFloat(value.toFixed(2)) : value)
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId, range = '7' } = req.query;
    if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

    const bId = BigInt(babyId as string);
    const days = parseInt(range as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    try {
        // 1. Feeding Stats (Daily ml)
        const feedingRecords = await prisma.feedingRecord.findMany({
            where: { babyId: bId, time: { gte: startDate }, feedingType: 'bottle' },
            orderBy: { time: 'asc' }
        });

        // 2. Sleep Stats (Daily hours)
        const sleepRecords = await prisma.sleepRecord.findMany({
            where: { babyId: bId, startTime: { gte: startDate } },
            orderBy: { startTime: 'asc' }
        });

        // 3. Growth Stats (History)
        const growthRecords = await prisma.growthRecord.findMany({
            where: { babyId: bId },
            orderBy: { time: 'asc' }
        });

        // Aggregate by day
        const dailyFeeding: Record<string, number> = {};
        const dailySleep: Record<string, number> = {};

        // Init days
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            dailyFeeding[key] = 0;
            dailySleep[key] = 0;
        }

        feedingRecords.forEach(r => {
            const key = r.time.toISOString().split('T')[0];
            if (dailyFeeding[key] !== undefined) {
                dailyFeeding[key] += r.amount || 0;
            }
        });

        sleepRecords.forEach(r => {
            const key = r.startTime.toISOString().split('T')[0];
            if (dailySleep[key] !== undefined) {
                const dur = r.duration ? r.duration / 60 : (r.endTime ? (r.endTime.getTime() - r.startTime.getTime()) / 60000 : 0);
                dailySleep[key] += dur;
            }
        });

        return res.status(200).json(safeJSON({
            feeding: Object.entries(dailyFeeding).map(([date, amount]) => ({ date, amount })),
            sleep: Object.entries(dailySleep).map(([date, minutes]) => ({ date, hours: parseFloat((minutes / 60).toFixed(1)) })),
            growth: growthRecords.map(r => ({
                date: r.time.toISOString().split('T')[0],
                height: r.height,
                weight: r.weight,
                head: r.headCircumference
            }))
        }));

    } catch (error) {
        console.error('Stats Chart API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
