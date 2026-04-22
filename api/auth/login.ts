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
            if (!user || !user.password) {
                return res.status(401).json({ message: '手机号或密码错误' });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ message: '手机号或密码错误' });
            }

            await prisma.user.update({ 
                where: { id: user.id }, 
                data: { lastLoginTime: new Date() } 
            });

            const token = jwt.sign({ userId: user.id.toString(), phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ token, userInfo: safeJSON(user) });
        } else if (code) {
            // Wechat Login (Placeholder for real implementation)
            // For now, if we don't have real wechat config, return error
            return res.status(400).json({ message: '微信登录暂未配置' });
        } else {
            return res.status(400).json({ message: '请提供手机号和密码' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ message: '服务器内部错误' });
    }
}
