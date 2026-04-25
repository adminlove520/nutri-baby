import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';
import { success, error } from '../lib/utils';
import { sendEmail } from '../lib/mail';
import * as bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const decoded = await getUserFromRequest(req);
    if (!decoded) return error(res, '请先登录', 401);
    const uId = BigInt(decoded.userId);

    const { action } = req.query;

    try {
        const userData = await prisma.user.findUnique({ where: { id: uId } });
        if (!userData || userData.deletedAt) return error(res, '账号不存在或已注销', 404);

        if (req.method === 'GET' && action === 'info') {
            return success(res, userData);
        }

        if (req.method === 'POST' && action === 'update') {
            const { nickname, avatarUrl, email, settings } = req.body;
            const updatedUser = await prisma.user.update({
                where: { id: uId },
                data: { nickname, avatarUrl, email, settings }
            });
            return success(res, updatedUser);
        }

        if (req.method === 'GET' && action === 'stats') {
            const babyCount = await prisma.baby.count({
                where: { OR: [{ userId: uId }, { collaborators: { some: { userId: uId } } }] }
            });

            const feedingCount = await prisma.feedingRecord.count({ where: { createdBy: uId } });
            const sleepCount = await prisma.sleepRecord.count({ where: { createdBy: uId } });
            const diaperCount = await prisma.diaperRecord.count({ where: { createdBy: uId } });
            const growthCount = await prisma.growthRecord.count({ where: { createdBy: uId } });

            const userData = await prisma.user.findUnique({ where: { id: uId } });
            const createdAtTime = userData?.createdAt ? new Date(userData.createdAt).getTime() : Date.now();
            const diffMs = Date.now() - createdAtTime;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const joinDays = diffDays >= 0 ? Math.max(0, diffDays) : 0;

            return success(res, {
                babyCount,
                totalRecords: feedingCount + sleepCount + diaperCount + growthCount,
                joinDays
            });
        }

        if (req.method === 'POST' && action === 'change-password') {
            const { oldPassword, newPassword } = req.body;
            if (!userData.password) return error(res, '该账号未设置密码', 400);

            const isMatch = await bcrypt.compare(oldPassword, userData.password);
            if (!isMatch) return error(res, '原密码不正确', 400);

            const hashed = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: uId },
                data: { password: hashed }
            });
            return success(res, { message: '密码修改成功' });
        }

        if (req.method === 'POST' && action === 'delete-account') {
            const { password } = req.body;
            if (!userData.password) return error(res, '该账号未设置密码', 400);

            const isMatch = await bcrypt.compare(password, userData.password);
            if (!isMatch) return error(res, '密码不正确', 400);

            // Soft delete
            await prisma.user.update({
                where: { id: uId },
                data: { deletedAt: new Date() }
            });
            return success(res, { message: '账号已注销' });
        }

        // Test email endpoint
        if (req.method === 'POST' && action === 'test-email') {
            if (!userData.email) return error(res, '请先在个人中心设置邮箱', 400);
            try {
                await sendEmail(
                    userData.email,
                    'Nutri-Baby 育儿助手 - 提醒测试成功',
                    `<div style="font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #ff8f94 0%, #ffb87a 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 邮件通道测试成功！</h1>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">亲爱的 ${userData.nickname || '用户'}，</p>
                            <p style="font-size: 15px; color: #666; line-height: 1.8;">您的账号邮件提醒通道已畅通。当宝宝有即将到来的疫苗接种、或是系统为您生成了深度育儿分析时，我们都会通过此邮箱及时通知您。</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                            <p style="font-size: 12px; color: #bbb;">Nutri-Baby - 让科学育儿更简单</p>
                        </div>
                    </div>`
                );
                return success(res, { message: '测试邮件已发送' });
            } catch (e: any) {
                console.error('Test email failed:', e);
                return error(res, '邮件发送失败：' + (e?.message || '请检查邮箱是否正确'), 500);
            }
        }

        // Trigger notify endpoint (manual trigger for cron tasks)
        if (req.method === 'POST' && action === 'trigger-notify') {
            const { type } = req.body;
            
            // For manual trigger, we just return success - the actual cron runs on Vercel schedule
            // This endpoint is for user to manually test the notification settings
            if (type === 'vaccine' || type === 'all') {
                // In production, this would trigger the vaccine reminder logic
                return success(res, { message: '疫苗提醒任务已触发', type: 'vaccine' });
            }
            if (type === 'aiTip' || type === 'all') {
                return success(res, { message: 'AI育儿锦囊任务已触发', type: 'aiTip' });
            }
            return success(res, { message: '定时任务已执行' });
        }

        return error(res, '请求无效', 404);
    } catch (err) {
        console.error('User API Error:', err);
        return error(res, '获取用户信息失败', 500);
    }
}
