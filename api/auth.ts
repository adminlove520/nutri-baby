import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { success, error, validate } from '../lib/utils';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;

    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
        return error(res, '数据库配置缺失，请在 Vercel 中设置 DATABASE_URL', 500);
    }

    if (req.method !== 'POST') return error(res, '仅支持 POST 请求', 405);

    try {
        if (action === 'login') {
            const { account, password, phone } = req.body;
            const targetAccount = account || phone;

            if (!targetAccount || !password) return error(res, '请输入账号和密码');

            const user = await prisma.user.findFirst({
                where: { OR: [{ phone: targetAccount }, { email: targetAccount }] }
            });

            if (!user || !user.password) return error(res, '账号不存在或未设置密码', 401);

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) return error(res, '账号或密码错误', 401);

            await prisma.user.update({ where: { id: user.id }, data: { lastLoginTime: new Date() } });

            const token = jwt.sign(
                { userId: user.id.toString(), phone: user.phone, email: user.email },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return success(res, { token, userInfo: user });
        }

        if (action === 'register') {
            const { account, password, nickname, phone } = req.body;
            const targetAccount = account || phone;

            if (!targetAccount || !password) return error(res, '账号和密码为必填项');
            
            const isEmail = validate.email(targetAccount);
            const isPhone = validate.phone(targetAccount);

            if (!isEmail && !isPhone) return error(res, '请输入有效的手机号或邮箱');
            if (password.length < 6) return error(res, '密码长度至少为 6 位');

            const existing = await prisma.user.findFirst({
                where: { OR: [{ phone: targetAccount }, { email: targetAccount }] }
            });

            if (existing) return error(res, '该账号已被注册', 409);

            const hashedPassword = await bcrypt.hash(password, 10);
            const userData: any = {
                password: hashedPassword,
                nickname: nickname || `新用户-${targetAccount.slice(-4)}`,
                avatarUrl: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
                lastLoginTime: new Date()
            };

            if (isEmail) userData.email = targetAccount; else userData.phone = targetAccount;

            const user = await prisma.user.create({ data: userData });
            const token = jwt.sign(
                { userId: user.id.toString(), phone: user.phone, email: user.email },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return success(res, { token, userInfo: user }, 201);
        }

        return error(res, '未知的操作类型');
    } catch (err: any) {
        console.error('Auth API Error:', err);
        // Temporarily return the error message to the user for debugging
        return error(res, `注册失败: ${err.message || '未知内部错误'}`, 500);
    }
}
