import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest } from '../../lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'invite') throw new Error('Invalid token');

        const babyId = BigInt(decoded.babyId);
        const userId = BigInt(user.userId);

        const existing = await prisma.babyCollaborator.findUnique({
            where: { babyId_userId: { babyId, userId } }
        });

        if (!existing) {
            const owner = await prisma.baby.findFirst({ where: { id: babyId, userId } });
            if (!owner) {
                await prisma.babyCollaborator.create({
                    data: { babyId, userId, role: decoded.role, relationship: 'family', accessType: 'permanent' }
                });
            }
        }
        return res.status(200).json({ message: 'Joined', babyId: decoded.babyId });
    } catch (e) {
        return res.status(400).json({ message: 'Invalid or expired token' });
    }
}
