import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest } from '../../lib/auth';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    try {
        if (req.method === 'GET') {
            const babies = await prisma.baby.findMany({
                where: { userId: BigInt(user.userId) },
                orderBy: { createdAt: 'desc' }
            });
            return res.status(200).json(safeJSON(babies));
        }

        if (req.method === 'POST') {
            const { name, nickname, gender, birthDate, avatarUrl } = req.body;
            if (!name || !gender || !birthDate) return res.status(400).json({ message: 'Missing fields' });

            const baby = await prisma.baby.create({
                data: { name, nickname, gender, birthDate, avatarUrl, userId: BigInt(user.userId) }
            });
            return res.status(201).json(safeJSON(baby));
        }

        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error('Baby Collection API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
