import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : (key === 'password' ? undefined : value)
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const { phone, password, code } = req.body;

    try {
        if (phone && password) {
            // Credential Login
            const user = await prisma.user.findUnique({ where: { phone } });
            if (!user || !user.password) return res.status(401).json({ message: 'Invalid credentials' });

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

            await prisma.user.update({ where: { id: user.id }, data: { lastLoginTime: new Date() } });

            const token = jwt.sign({ userId: user.id.toString(), phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ token, userInfo: safeJSON(user) });
        } else if (code) {
            // Code/Wechat Login
            let openid = code.startsWith('mock-') ? code : 'wechat-openid-' + Math.random().toString(36).substring(7);
            let user = await prisma.user.findUnique({ where: { openid } });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        openid,
                        nickname: 'New User',
                        avatarUrl: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
                        lastLoginTime: new Date(),
                    },
                });
            } else {
                await prisma.user.update({ where: { id: user.id }, data: { lastLoginTime: new Date() } });
            }

            const token = jwt.sign({ userId: user.id.toString(), openid: user.openid }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ token, userInfo: safeJSON(user) });
        } else {
            return res.status(400).json({ message: 'Missing login credentials' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
