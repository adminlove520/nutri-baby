import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest } from '../../lib/auth';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : (key === 'password' ? undefined : value)
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { nickname, avatarUrl } = req.body;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: BigInt(user.userId) },
            data: {
                nickname,
                avatarUrl
            }
        });

        return res.status(200).json(safeJSON(updatedUser));
    } catch (error) {
        console.error('Update Profile Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
