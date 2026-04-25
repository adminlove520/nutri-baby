import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { success, error, validate } from '../lib/utils';
import { sendEmail } from '../lib/mail';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-dev';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://baby.dfyx.xyz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { action } = req.query;

    if (!process.env.PRISMA_DATABASE_URL && !process.env.DATABASE_URL) {
        return error(res, '系统配置错误：数据库连接未就绪', 500);
    }

    if (req.method !== 'POST') return error(res, '仅支持 POST 请求', 405);

    try {
        if (action === 'login') {
            const { account, password, phone } = req.body;
            const targetAccount = account || phone;

            if (!targetAccount || !password) return error(res, '请输入账号和密码');

            const user = await prisma.user.findFirst({
                where: { 
                    OR: [{ phone: targetAccount }, { email: targetAccount }],
                    deletedAt: null
                }
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

            if (existing) {
                if (existing.deletedAt) {
                    // Reactivate account
                    const hashedPassword = await bcrypt.hash(password, 10);
                    const user = await prisma.user.update({
                        where: { id: existing.id },
                        data: {
                            password: hashedPassword,
                            nickname: nickname || existing.nickname || `用户-${targetAccount.slice(-4)}`,
                            deletedAt: null,
                            lastLoginTime: new Date()
                        }
                    });
                    const token = jwt.sign(
                        { userId: user.id.toString(), phone: user.phone, email: user.email },
                        JWT_SECRET,
                        { expiresIn: '7d' }
                    );
                    return success(res, { token, userInfo: user }, 200);
                }
                return error(res, '该账号已被注册', 409);
            }

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

        // 忘记密码 - 发送重置邮件
        if (action === 'forgot-password') {
            const { account } = req.body;

            if (!account) return error(res, '请输入手机号或邮箱');

            const isEmail = validate.email(account);
            const isPhone = validate.phone(account);

            if (!isEmail && !isPhone) return error(res, '请输入有效的手机号或邮箱');

            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        isEmail ? { email: account } : undefined,
                        isPhone ? { phone: account } : undefined
                    ].filter(Boolean) as any,
                    deletedAt: null
                }
            });

            // 为了安全，不管账号存不存在都返回成功
            if (!user) {
                return success(res, { message: '如果该账号存在，重置链接已发送' });
            }

            // 生成15分钟有效的重置Token
            const resetToken = jwt.sign(
                { userId: user.id.toString(), type: 'password-reset' },
                JWT_SECRET,
                { expiresIn: '15m' }
            );

            const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;

            // 发送重置邮件
            if (user.email) {
                const html = `
                    <div style="font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #ff8f94 0%, #ffb87a 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Nutri-Baby 密码重置</h1>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您好 ${user.nickname || '用户'}，</p>
                            <p style="font-size: 15px; color: #666; line-height: 1.8;">我们收到了您对 Nutri-Baby 账户的密码重置请求。请点击下方按钮重置您的密码：</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ff8f94 0%, #ff6b8a 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 30px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(255,143,148,0.4);">重置密码</a>
                            </div>
                            <p style="font-size: 14px; color: #999; line-height: 1.6;">此链接将在 <strong>15 分钟</strong>后过期。</p>
                            <p style="font-size: 14px; color: #999; line-height: 1.6;">如果您没有发起密码重置请求，请忽略此邮件。</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                            <p style="font-size: 12px; color: #bbb;">Nutri-Baby - 让科学育儿更简单</p>
                        </div>
                    </div>
                `;

                await sendEmail(user.email, 'Nutri-Baby 密码重置', html);
            }

            return success(res, { message: '如果该账号存在，重置链接已发送' });
        }

        // 重置密码
        if (action === 'reset-password') {
            const { token, password } = req.body;

            if (!token) return error(res, '缺少重置令牌');
            if (!password || password.length < 6) return error(res, '密码长度至少为 6 位');

            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                
                if (decoded.type !== 'password-reset') {
                    return error(res, '无效的重置链接', 400);
                }

                const userId = BigInt(decoded.userId);
                const hashedPassword = await bcrypt.hash(password, 10);

                await prisma.user.update({
                    where: { id: userId },
                    data: { password: hashedPassword }
                });

                return success(res, { message: '密码重置成功，请使用新密码登录' });
            } catch (e: any) {
                if (e.name === 'TokenExpiredError') {
                    return error(res, '重置链接已过期，请重新获取', 400);
                }
                return error(res, '无效的重置链接', 400);
            }
        }

        return error(res, '未知的操作类型');
    } catch (err: any) {
        console.error('Auth API Error Object:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
        if (err.code === 'P2021') {
            return error(res, `系统初始化中：数据库表结构未就绪 (Missing: ${err.meta?.table || 'Unknown'}). 请等待部署脚本自动同步或联系管理员。`, 500);
        }
        return error(res, `服务器内部错误: ${err.message || '未知错误'}`, 500);
    }
}
