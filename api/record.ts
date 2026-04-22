import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { success, error } from '../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return error(res, '请先登录', 401);

    const rawType = req.query.type;
    const type = Array.isArray(rawType) ? rawType[0] : rawType;

    if (!type) return error(res, '未指定记录类型');

    try {
        if (req.method === 'GET') {
            const { babyId, limit = '50' } = req.query;
            if (!babyId) return error(res, '宝宝 ID 缺失');

            const bId = BigInt(babyId as string);
            if (!(await hasBabyPermission(user.userId, bId))) return error(res, '权限不足', 403);

            const take = parseInt(limit as string);

            let records = [];
            if (type === 'feeding') {
                records = await prisma.feedingRecord.findMany({ where: { babyId: bId }, orderBy: { time: 'desc' }, take });
            } else if (type === 'sleep') {
                records = await prisma.sleepRecord.findMany({ where: { babyId: bId }, orderBy: { startTime: 'desc' }, take });
            } else if (type === 'diaper') {
                records = await prisma.diaperRecord.findMany({ where: { babyId: bId }, orderBy: { time: 'desc' }, take });
            } else if (type === 'growth') {
                records = await prisma.growthRecord.findMany({ where: { babyId: bId }, orderBy: { time: 'desc' }, take });
            }

            return success(res, { records });

        } else if (req.method === 'POST') {
            const { babyId, time, ...rest } = req.body;
            if (!babyId) return error(res, '宝宝 ID 缺失');

            const bId = BigInt(babyId);
            if (!(await hasBabyPermission(user.userId, bId))) return error(res, '权限不足', 403);

            const uId = BigInt(user.userId);
            const recordTime = new Date(time || new Date());

            let result;
            if (type === 'feeding') {
                const { feedingType, type: fType, amount, duration, leftBreastMinutes, rightBreastMinutes, foodName, remark } = rest;
                result = await prisma.feedingRecord.create({
                    data: {
                        babyId: bId,
                        time: recordTime,
                        feedingType: fType || feedingType || 'breast',
                        amount: amount ? parseInt(amount) : null,
                        duration: duration ? parseInt(duration) : null,
                        detail: { leftBreastMinutes, rightBreastMinutes, foodName, remark },
                        createdBy: uId
                    }
                });
            } else if (type === 'sleep') {
                const { startTime, endTime, duration, type: sleepType, remark } = rest;
                result = await prisma.sleepRecord.create({
                    data: {
                        babyId: bId,
                        startTime: new Date(startTime || recordTime),
                        endTime: endTime ? new Date(endTime) : null,
                        duration: duration ? parseInt(duration) : null,
                        type: sleepType || 'night',
                        createdBy: uId
                    }
                });
            } else if (type === 'diaper') {
                const { type: diaperType, poopColor, poopTexture, remark, note } = rest;
                result = await prisma.diaperRecord.create({
                    data: {
                        babyId: bId,
                        time: recordTime,
                        type: diaperType || 'pee',
                        poopColor,
                        poopTexture,
                        note: note || remark,
                        createdBy: uId
                    }
                });
            } else if (type === 'growth') {
                const { height, weight, headCircumference, remark, note } = rest;
                result = await prisma.growthRecord.create({
                    data: {
                        babyId: bId,
                        time: recordTime,
                        height: height ? parseFloat(height) : null,
                        weight: weight ? parseFloat(weight) : null,
                        headCircumference: headCircumference ? parseFloat(headCircumference) : null,
                        note: note || remark,
                        createdBy: uId
                    }
                });
            }

            return success(res, result, 201);
        } else if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return error(res, '记录 ID 缺失');

            const rId = BigInt(id as string);
            
            let record;
            if (type === 'feeding') record = await prisma.feedingRecord.findUnique({ where: { id: rId } });
            else if (type === 'sleep') record = await prisma.sleepRecord.findUnique({ where: { id: rId } });
            else if (type === 'diaper') record = await prisma.diaperRecord.findUnique({ where: { id: rId } });
            else if (type === 'growth') record = await prisma.growthRecord.findUnique({ where: { id: rId } });

            if (!record) return error(res, '记录不存在', 404);
            
            if (!(await hasBabyPermission(user.userId, record.babyId))) {
                return error(res, '权限不足', 403);
            }

            if (type === 'feeding') await prisma.feedingRecord.delete({ where: { id: rId } });
            else if (type === 'sleep') await prisma.sleepRecord.delete({ where: { id: rId } });
            else if (type === 'diaper') await prisma.diaperRecord.delete({ where: { id: rId } });
            else if (type === 'growth') await prisma.growthRecord.delete({ where: { id: rId } });

            return success(res, { message: '记录已删除' });
        }
    } catch (err) {
        return error(res, '服务器开小差了，请稍后再试', 500);
    }
}
