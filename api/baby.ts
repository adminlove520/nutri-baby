import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import jwt from 'jsonwebtoken';
import { success, error } from '../lib/utils';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return error(res, '请先登录', 401);
    const uId = BigInt(user.userId);

    const { action, babyId } = req.query;

    try {
        // --- CRUD Actions ---
        if (!action) {
            if (req.method === 'GET') {
                const babies = await prisma.baby.findMany({
                    where: { OR: [{ userId: uId }, { collaborators: { some: { userId: uId } } }] },
                    include: { collaborators: true }
                });
                return success(res, babies);
            }

            if (req.method === 'POST') {
                const { name, nickname, gender, birthDate, avatarUrl } = req.body;
                if (!name || !birthDate) return error(res, '姓名和出生日期必填');
                
                const baby = await prisma.baby.create({
                    data: { name, nickname, gender: gender || 'male', birthDate: new Date(birthDate), avatarUrl, userId: uId }
                });
                return success(res, baby, 201);
            }

            if (req.method === 'PUT' && babyId) {
                const bId = BigInt(babyId as string);
                if (!(await hasBabyPermission(uId, bId))) return error(res, '您没有修改权限', 403);
                
                const { name, nickname, gender, birthDate, avatarUrl } = req.body;
                const updated = await prisma.baby.update({
                    where: { id: bId },
                    data: { 
                        name, nickname, gender, 
                        birthDate: birthDate ? new Date(birthDate) : undefined, 
                        avatarUrl 
                    }
                });
                return success(res, updated);
            }

            if (req.method === 'DELETE' && babyId) {
                const bId = BigInt(babyId as string);
                const baby = await prisma.baby.findUnique({ where: { id: bId } });
                if (!baby) return error(res, '记录不存在', 404);
                if (baby.userId !== uId) return error(res, '只有创建者可以删除档案', 403);
                
                await prisma.baby.delete({ where: { id: bId } });
                return res.status(204).end();
            }
        }

        // --- Specialized Actions ---
        if (action === 'vaccines') {
            if (!babyId) return error(res, '宝宝 ID 缺失');
            const bId = BigInt(babyId as string);
            if (!(await hasBabyPermission(uId, bId))) return error(res, '权限不足', 403);

            if (req.method === 'GET') {
                let schedules = await prisma.babyVaccineSchedule.findMany({ 
                    where: { babyId: bId }, 
                    orderBy: { scheduledDate: 'asc' } 
                });
                
                if (schedules.length === 0) {
                    const baby = await prisma.baby.findUnique({ where: { id: bId } });
                    const templates = await prisma.vaccinePlanTemplate.findMany({ orderBy: { ageInMonths: 'asc' } });
                    if (baby && templates.length > 0) {
                        const newSchedules = templates.map(t => {
                            const scheduledDate = new Date(baby.birthDate);
                            scheduledDate.setMonth(scheduledDate.getMonth() + t.ageInMonths);
                            return { 
                                babyId: bId, templateId: t.id, vaccineType: t.vaccineType, 
                                vaccineName: t.vaccineName, description: t.description, 
                                ageInMonths: t.ageInMonths, doseNumber: t.doseNumber, 
                                isRequired: t.isRequired, scheduledDate, createdBy: uId 
                            };
                        });
                        await prisma.babyVaccineSchedule.createMany({ data: newSchedules });
                        schedules = await prisma.babyVaccineSchedule.findMany({ 
                            where: { babyId: bId }, 
                            orderBy: { scheduledDate: 'asc' } 
                        });
                    }
                }
                return success(res, schedules);
            }
            
            if (req.method === 'POST') {
                const { id, status, vaccineDate, hospital, note } = req.body;
                if (!id) return error(res, '参数错误');
                const result = await prisma.babyVaccineSchedule.update({
                    where: { id: BigInt(id) },
                    data: { 
                        vaccinationStatus: status || 'completed', 
                        vaccineDate: vaccineDate ? new Date(vaccineDate) : new Date(), 
                        hospital, note, completedBy: uId, completedTime: new Date() 
                    }
                });
                return success(res, result);
            }
        }

        if (action === 'invite') {
            if (!babyId) return error(res, '参数错误');
            const bId = BigInt(babyId as string);
            if (!(await hasBabyPermission(uId, bId))) return error(res, '权限不足', 403);
            
            const token = jwt.sign(
                { babyId: bId.toString(), inviterId: uId.toString(), type: 'invite' }, 
                JWT_SECRET, 
                { expiresIn: '24h' }
            );
            return success(res, { token });
        }

        if (action === 'join') {
            if (req.method !== 'POST') return error(res, '方法不支持', 405);
            const { token, role } = req.body;
            if (!token) return error(res, '邀请码无效');
            
            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                if (decoded.type !== 'invite') return error(res, '无效的邀请凭证');
                
                const bId = BigInt(decoded.babyId);
                const exists = await prisma.babyCollaborator.findFirst({ where: { babyId: bId, userId: uId } });
                if (exists) return error(res, '您已经是该宝宝的守护者了');
                
                await prisma.babyCollaborator.create({ data: { babyId: bId, userId: uId, role: role || 'Member' } });
                return success(res, { message: '成功加入守护团队' });
            } catch (e) {
                return error(res, '邀请链接已过期或无效');
            }
        }

        return error(res, '请求无效', 404);
    } catch (err) {
        console.error('Baby API Error:', err);
        return error(res, '处理失败，请稍后再试', 500);
    }
}
