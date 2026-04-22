import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../../lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId, role = 'editor' } = req.body;
    if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

    if (!(await hasBabyPermission(user.userId, babyId))) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const token = jwt.sign({
        babyId, inviterId: user.userId, role, type: 'invite'
    }, JWT_SECRET, { expiresIn: '24h' });

    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = process.env.VITE_APP_URL || `${protocol}://${host}`;
    const url = `${baseUrl}/join?token=${token}`;

    return res.status(200).json({ token, url });
}
