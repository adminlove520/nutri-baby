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

    const { phone, email, account, password, nickname } = req.body;
    const regAccount = account || phone || email;
    
    if (!regAccount || !password) return res.status(400).json({ message: '账号和密码必填' });

    const isEmail = regAccount.includes('@');
    const isPhone = /^\d{11}$/.test(regAccount);

    if (!isEmail && !isPhone) return res.status(400).json({ message: '请输入正确的手机号或邮箱' });

    try {
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: regAccount },
                    { email: regAccount }
                ]
            }
        });
        
        if (existing) return res.status(409).json({ message: '该手机号或邮箱已注册' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userData: any = {
            password: hashedPassword,
            nickname: nickname || `用户-${regAccount.slice(-4)}`,
            avatarUrl: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
            lastLoginTime: new Date()
        };

        if (isEmail) {
            userData.email = regAccount;
        } else {
            userData.phone = regAccount;
        }

        const user = await prisma.user.create({
            data: userData
        });

        const token = jwt.sign(
            { userId: user.id.toString(), phone: user.phone, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        return res.status(201).json({ token, userInfo: safeJSON(user) });
    } catch (error) {
        console.error('Register Error:', error);
        return res.status(500).json({ message: '服务器内部错误' });
    }
}
