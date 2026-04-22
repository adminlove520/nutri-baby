import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';
import { success, error } from '../lib/utils';
import * as bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return error(res, '请先登录', 401);
    const uId = BigInt(user.userId);

    const { action } = req.query;

    try {
        if (req.method === 'GET' && action === 'info') {
            const userData = await prisma.user.findUnique({ where: { id: uId } });
            if (!userData) return error(res, '用户不存在', 404);
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
            const joinDays = userData ? Math.floor((new Date().getTime() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

            return success(res, {
                babyCount,
                totalRecords: feedingCount + sleepCount + diaperCount + growthCount,
                joinDays: joinDays || 1
            });
        }

        if (req.method === 'POST' && action === 'change-password') {
            const { oldPassword, newPassword } = req.body;
            const userData = await prisma.user.findUnique({ where: { id: uId } });
            if (!userData) return error(res, '用户不存在', 404);

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
            const userData = await prisma.user.findUnique({ where: { id: uId } });
            if (!userData) return error(res, '用户不存在', 404);

            const isMatch = await bcrypt.compare(password, userData.password);
            if (!isMatch) return error(res, '密码不正确', 400);

            // Soft delete
            await prisma.user.update({
                where: { id: uId },
                data: { deletedAt: new Date() }
            });
            return success(res, { message: '账号已注销' });
        }

        return error(res, '请求无效', 404);
    } catch (err) {
        console.error('User API Error:', err);
        return error(res, '获取用户信息失败', 500);
    }
}
