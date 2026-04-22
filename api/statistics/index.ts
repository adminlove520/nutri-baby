import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest } from '../../lib/auth';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId } = req.query;
    if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

    const bId = BigInt(babyId as string);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const [feeding, sleep, diaper, growth] = await Promise.all([
            prisma.feedingRecord.findMany({
                where: { babyId: bId, time: { gte: today } },
                orderBy: { time: 'desc' }
            }),
            prisma.sleepRecord.findMany({
                where: { babyId: bId, startTime: { gte: today } }
            }),
            prisma.diaperRecord.findMany({
                where: { babyId: bId, time: { gte: today } }
            }),
            prisma.growthRecord.findFirst({
                where: { babyId: bId },
                orderBy: { time: 'desc' }
            })
        ]);

        const bottleMl = feeding.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const sleepMinutes = sleep.reduce((acc, curr) => {
            const dur = curr.duration || (curr.endTime ? Math.floor((curr.endTime.getTime() - curr.startTime.getTime()) / 60000) : 0);
            return acc + dur;
        }, 0);

        return res.status(200).json(safeJSON({
            today: {
                feeding: {
                    totalCount: feeding.length,
                    bottleMl: bottleMl,
                    lastFeedingTime: feeding.length > 0 ? feeding[0].time : null
                },
                sleep: {
                    totalMinutes: sleepMinutes
                },
                diaper: {
                    totalCount: diaper.length
                },
                growth: {
                    latestHeight: growth?.height || 0,
                    latestWeight: growth?.weight || 0
                }
            }
        }));

    } catch (error) {
        console.error('Statistics Summary API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
