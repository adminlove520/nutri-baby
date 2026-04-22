import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest } from '../../lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId, role = 'editor' } = req.body;
    if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

    const token = jwt.sign({
        babyId, inviterId: user.userId, role, type: 'invite'
    }, JWT_SECRET, { expiresIn: '24h' });

    const url = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/join?token=${token}`;
    return res.status(200).json({ token, url });
}
