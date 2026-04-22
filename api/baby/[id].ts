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

    const { id } = req.query;
    if (!id || Array.isArray(id)) return res.status(400).json({ message: 'Invalid ID' });

    try {
        if (req.method === 'GET') {
            const baby = await prisma.baby.findUnique({ where: { id: BigInt(id) } });
            if (!baby) return res.status(404).json({ message: 'Not Found' });
            return res.status(200).json(safeJSON(baby));
        }

        if (req.method === 'PUT') {
            const { name, nickname, gender, birthDate, avatarUrl } = req.body;
            const updated = await prisma.baby.update({
                where: { id: BigInt(id) },
                data: { name, nickname, gender, birthDate, avatarUrl }
            });
            return res.status(200).json(safeJSON(updated));
        }

        if (req.method === 'DELETE') {
            await prisma.baby.delete({ where: { id: BigInt(id) } });
            return res.status(200).json({ message: 'Deleted' });
        }

        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error('Baby ID API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
