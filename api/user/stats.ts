import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest } from '../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const uId = BigInt(user.userId);

    try {
        const userData = await prisma.user.findUnique({
            where: { id: uId },
            include: {
                babies: { select: { id: true } },
                collaborations: { select: { babyId: true } }
            }
        });

        if (!userData) return res.status(404).json({ message: 'User not found' });

        const babyIdsSet = new Set<bigint>();
        userData.babies.forEach(b => babyIdsSet.add(b.id));
        userData.collaborations.forEach(c => babyIdsSet.add(c.babyId));
        
        const babyIds = Array.from(babyIdsSet);

        const [feedingCount, sleepCount, diaperCount, growthCount] = await Promise.all([
            prisma.feedingRecord.count({ where: { babyId: { in: babyIds } } }),
            prisma.sleepRecord.count({ where: { babyId: { in: babyIds } } }),
            prisma.diaperRecord.count({ where: { babyId: { in: babyIds } } }),
            prisma.growthRecord.count({ where: { babyId: { in: babyIds } } })
        ]);

        const totalRecords = feedingCount + sleepCount + diaperCount + growthCount;
        const joinDays = Math.max(1, Math.ceil((new Date().getTime() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

        return res.status(200).json({
            babyCount: babyIds.length,
            totalRecords,
            joinDays
        });
    } catch (error) {
        console.error('User Stats API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
