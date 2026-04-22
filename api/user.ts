import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : (key === 'password' ? undefined : value)
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const uId = BigInt(user.userId);

    const { action } = req.query;

    if (req.method === 'GET' && action === 'stats') {
        const userData = await prisma.user.findUnique({
            where: { id: uId },
            include: { babies: { select: { id: true } }, collaborations: { select: { babyId: true } } }
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
        return res.status(200).json({ babyCount: babyIds.length, totalRecords, joinDays });
    }

    if (req.method === 'POST' && action === 'update') {
        const { nickname, avatarUrl } = req.body;
        const updatedUser = await prisma.user.update({
            where: { id: uId },
            data: { nickname, avatarUrl }
        });
        return res.status(200).json(safeJSON(updatedUser));
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
