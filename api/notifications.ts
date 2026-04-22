import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const uId = BigInt(user.userId);

    if (req.method === 'GET') {
        try {
            const notifications = await prisma.notification.findMany({
                where: { userId: uId },
                orderBy: { createdAt: 'desc' },
                take: 50
            });
            return res.status(200).json(safeJSON(notifications));
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    if (req.method === 'POST') {
        const { ids } = req.body;
        if (!Array.isArray(ids)) return res.status(400).json({ message: 'IDs array required' });

        try {
            await prisma.notification.updateMany({
                where: { id: { in: ids.map(id => BigInt(id)) }, userId: uId },
                data: { isRead: true }
            });
            return res.status(200).json({ message: 'Success' });
        } catch (error) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
