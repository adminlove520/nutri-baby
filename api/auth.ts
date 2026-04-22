import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : (key === 'password' ? undefined : value)
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;

    if (req.method === 'POST') {
        if (action === 'login') {
            const { account, password, code } = req.body;
            try {
                if (account && password) {
                    const user = await prisma.user.findFirst({
                        where: { OR: [{ phone: account }, { email: account }] }
                    });
                    if (!user || !user.password) return res.status(401).json({ message: '账号或密码错误' });
                    const isValid = await bcrypt.compare(password, user.password);
                    if (!isValid) return res.status(401).json({ message: '账号或密码错误' });
                    await prisma.user.update({ where: { id: user.id }, data: { lastLoginTime: new Date() } });
                    const token = jwt.sign({ userId: user.id.toString(), phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
                    return res.status(200).json({ token, userInfo: safeJSON(user) });
                }
                return res.status(400).json({ message: 'Missing credentials' });
            } catch (error) {
                return res.status(500).json({ message: 'Internal Error' });
            }
        }

        if (action === 'register') {
            const { account, password, nickname } = req.body;
            if (!account || !password) return res.status(400).json({ message: '账号和密码必填' });
            const isEmail = account.includes('@');
            const isPhone = /^\d{11}$/.test(account);
            if (!isEmail && !isPhone) return res.status(400).json({ message: '请输入正确的手机号或邮箱' });
            try {
                const existing = await prisma.user.findFirst({ where: { OR: [{ phone: account }, { email: account }] } });
                if (existing) return res.status(409).json({ message: '该手机号或邮箱已注册' });
                const hashedPassword = await bcrypt.hash(password, 10);
                const userData: any = { password: hashedPassword, nickname: nickname || `用户-${account.slice(-4)}`, avatarUrl: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png', lastLoginTime: new Date() };
                if (isEmail) userData.email = account; else userData.phone = account;
                const user = await prisma.user.create({ data: userData });
                const token = jwt.sign({ userId: user.id.toString(), phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
                return res.status(201).json({ token, userInfo: safeJSON(user) });
            } catch (error) {
                return res.status(500).json({ message: 'Internal Error' });
            }
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
