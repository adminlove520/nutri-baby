import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import jwt from 'jsonwebtoken';
import { success, error } from '../lib/utils';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-dev';

// 2021国家免疫规划疫苗儿童免疫程序（内联，避免模块解析问题）
const VACCINE_STANDARDS_2021 = [
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第1剂', ageInMonths: 0, doseNumber: 1, isRequired: true, targetDisease: '乙型肝炎', tips: '出生后24小时内尽快接种' },
    { vaccineName: '卡介苗', vaccineType: '卡介苗', description: '出生接种', ageInMonths: 0, doseNumber: 1, isRequired: true, targetDisease: '结核病', tips: '皮内注射，接种后会出现小红肿，属于正常反应' },
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第2剂', ageInMonths: 1, doseNumber: 2, isRequired: true, targetDisease: '乙型肝炎', tips: '与第1剂间隔1个月' },
    { vaccineName: '脊灰灭活疫苗(IPV)', vaccineType: '脊灰', description: '第1剂', ageInMonths: 2, doseNumber: 1, isRequired: true, targetDisease: '脊髓灰质炎（小儿麻痹症）', tips: '2021年新政：前两剂次均使用灭活疫苗' },
    { vaccineName: '脊灰灭活疫苗(IPV)', vaccineType: '脊灰', description: '第2剂', ageInMonths: 3, doseNumber: 2, isRequired: true, targetDisease: '脊髓灰质炎（小儿麻痹症）', tips: '与第1剂间隔1个月' },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第1剂', ageInMonths: 3, doseNumber: 1, isRequired: true, targetDisease: '百日咳、白喉、破伤风', tips: '接种后可能出现发热或局部红肿，建议物理降温' },
    { vaccineName: '脊灰减毒活疫苗(bOPV)', vaccineType: '脊灰', description: '第3剂', ageInMonths: 4, doseNumber: 3, isRequired: true, targetDisease: '脊髓灰质炎（小儿麻痹症）', tips: '口服接种，接种前后半小时不要喂热水或母乳' },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第2剂', ageInMonths: 4, doseNumber: 2, isRequired: true, targetDisease: '百日咳、白喉、破伤风', tips: '与第1剂间隔1个月' },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第3剂', ageInMonths: 5, doseNumber: 3, isRequired: true, targetDisease: '百日咳、白喉、破伤风', tips: '与第2剂间隔1个月' },
    { vaccineName: '乙肝疫苗', vaccineType: '乙肝', description: '第3剂', ageInMonths: 6, doseNumber: 3, isRequired: true, targetDisease: '乙型肝炎', tips: '与第1剂间隔6个月' },
    { vaccineName: 'A群流脑多糖疫苗', vaccineType: '流脑', description: '第1剂', ageInMonths: 6, doseNumber: 1, isRequired: true, targetDisease: '流行性脑脊髓膜炎', tips: '注意观察是否有皮疹' },
    { vaccineName: '麻腮风疫苗', vaccineType: '麻腮风', description: '第1剂', ageInMonths: 8, doseNumber: 1, isRequired: true, targetDisease: '麻疹、腮腺炎、风疹', tips: '8月龄及时接种，预防冬春季高发传染病' },
    { vaccineName: '乙脑减毒活疫苗', vaccineType: '乙脑', description: '第1剂', ageInMonths: 8, doseNumber: 1, isRequired: true, targetDisease: '流行性乙型脑炎', tips: '预防蚊虫叮咬传播的脑炎' },
    { vaccineName: 'A群流脑多糖疫苗', vaccineType: '流脑', description: '第2剂', ageInMonths: 9, doseNumber: 2, isRequired: true, targetDisease: '流行性脑脊髓膜炎', tips: '与第1剂间隔3个月' },
    { vaccineName: '麻腮风疫苗', vaccineType: '麻腮风', description: '第2剂', ageInMonths: 18, doseNumber: 2, isRequired: true, targetDisease: '麻疹、腮腺炎、风疹', tips: '加强免疫，提供更持久保护' },
    { vaccineName: '百白破疫苗', vaccineType: '百白破', description: '第4剂', ageInMonths: 18, doseNumber: 4, isRequired: true, targetDisease: '百日咳、白喉、破伤风', tips: '1.5岁加强免疫' },
    { vaccineName: '甲肝减毒活疫苗', vaccineType: '甲肝', description: '第1剂', ageInMonths: 18, doseNumber: 1, isRequired: true, targetDisease: '甲型肝炎', tips: '单剂次减毒活疫苗' },
    { vaccineName: '乙脑减毒活疫苗', vaccineType: '乙脑', description: '第2剂', ageInMonths: 24, doseNumber: 2, isRequired: true, targetDisease: '流行性乙型脑炎', tips: '2周岁加强' },
    { vaccineName: 'A群C群流脑多糖疫苗', vaccineType: '流脑', description: '第1剂', ageInMonths: 36, doseNumber: 1, isRequired: true, targetDisease: '流行性脑脊髓膜炎', tips: '3周岁接种AC结合或多糖疫苗' },
    { vaccineName: '脊灰减毒活疫苗(bOPV)', vaccineType: '脊灰', description: '第4剂', ageInMonths: 48, doseNumber: 4, isRequired: true, targetDisease: '脊髓灰质炎（小儿麻痹症）', tips: '4周岁最后一次脊灰疫苗' },
    { vaccineName: '白破疫苗', vaccineType: '百白破', description: '第5剂(加强)', ageInMonths: 72, doseNumber: 5, isRequired: true, targetDisease: '白喉、破伤风', tips: '6周岁加强，不再包含百日咳成分' },
    { vaccineName: 'A群C群流脑多糖疫苗', vaccineType: '流脑', description: '第2剂', ageInMonths: 72, doseNumber: 2, isRequired: true, targetDisease: '流行性脑脊髓膜炎', tips: '6周岁加强' },
];

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
                // 手动序列化 BigInt 字段，确保安全
                const safeBabies = babies.map((b: typeof babies[0]) => ({
                    ...b,
                    id: b.id.toString(),
                    userId: b.userId.toString(),
                    collaborators: (b.collaborators || []).map((c: typeof babies[0]['collaborators'][0]) => ({
                        ...c,
                        id: c.id.toString(),
                        babyId: c.babyId.toString(),
                        userId: c.userId.toString(),
                    }))
                }));
                return success(res, safeBabies);
            }

            if (req.method === 'POST') {
                const { name, nickname, gender, birthDate, avatarUrl } = req.body;
                if (!name || !birthDate) return error(res, '姓名和出生日期必填');

                const baby = await prisma.baby.create({
                    data: { name, nickname, gender: gender || 'male', birthDate: new Date(birthDate), avatarUrl, userId: uId }
                });
                return success(res, { ...baby, id: baby.id.toString(), userId: baby.userId.toString() }, 201);
            }

            if (req.method === 'PUT' && babyId) {
                const bId = BigInt(babyId as string);
                if (!(await hasBabyPermission(uId, bId))) return error(res, '您没有修改权限', 403);

                const { name, nickname, gender, birthDate, avatarUrl } = req.body;
                const oldBaby = await prisma.baby.findUnique({ where: { id: bId } });
                
                const updated = await prisma.baby.update({
                    where: { id: bId },
                    data: {
                        name, nickname, gender,
                        birthDate: birthDate ? new Date(birthDate) : undefined,
                        avatarUrl
                    }
                });

                // 如果出生日期发生变化，同步更新所有未完成的疫苗接种计划时间
                if (birthDate && oldBaby && new Date(birthDate).getTime() !== new Date(oldBaby.birthDate).getTime()) {
                    const schedules = await prisma.babyVaccineSchedule.findMany({
                        where: { babyId: bId, vaccinationStatus: 'pending' }
                    });
                    
                    const newBirthDate = new Date(birthDate);
                    for (const s of schedules) {
                        const newScheduledDate = new Date(newBirthDate);
                        newScheduledDate.setMonth(newScheduledDate.getMonth() + s.ageInMonths);
                        await prisma.babyVaccineSchedule.update({
                            where: { id: s.id },
                            data: { scheduledDate: newScheduledDate }
                        });
                    }
                }

                return success(res, { ...updated, id: updated.id.toString(), userId: updated.userId.toString() });
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
                    // 自动从疫苗标准初始化
                    const baby = await prisma.baby.findUnique({ where: { id: bId } });
                    if (!baby?.birthDate) {
                        return success(res, []);
                    }

                    // 使用内联的2021国家免疫规划标准生成接种计划
                    const newSchedules = VACCINE_STANDARDS_2021.map(t => {
                        const scheduledDate = new Date(baby.birthDate);
                        scheduledDate.setMonth(scheduledDate.getMonth() + t.ageInMonths);
                        return {
                            babyId: bId,
                            vaccineName: t.vaccineName,
                            vaccineType: t.vaccineType,
                            description: t.description,
                            ageInMonths: t.ageInMonths,
                            doseNumber: t.doseNumber,
                            isRequired: t.isRequired,
                            targetDisease: t.targetDisease,
                            tips: t.tips,
                            scheduledDate,
                            createdBy: uId
                        };
                    });
                    await prisma.babyVaccineSchedule.createMany({ data: newSchedules });
                    schedules = await prisma.babyVaccineSchedule.findMany({
                        where: { babyId: bId },
                        orderBy: { scheduledDate: 'asc' }
                    });
                }

                const safeSchedules = (schedules as any[]).map((s: any) => ({
                    ...s,
                    id: s.id.toString(),
                    babyId: s.babyId.toString(),
                    templateId: s.templateId?.toString() ?? null,
                    createdBy: s.createdBy?.toString() ?? null,
                    completedBy: s.completedBy?.toString() ?? null,
                }));
                return success(res, safeSchedules);
            }

            if (req.method === 'POST') {
                const { id, status, vaccineDate, hospital, note, batchNumber, doctor, reaction } = req.body;
                if (!id) {
                    // Create new record (manual add)
                    const baby = await prisma.baby.findUnique({ where: { id: bId } });
                    const newRecord = await prisma.babyVaccineSchedule.create({
                        data: {
                            babyId: bId,
                            vaccineName: req.body.vaccineName || '手动添加',
                            doseNumber: req.body.doseNumber || 1,
                            ageInMonths: 0,
                            vaccineType: 'custom',
                            isRequired: false,
                            isCustom: true,
                            vaccinationStatus: status || 'completed',
                            vaccineDate: vaccineDate ? new Date(vaccineDate) : new Date(),
                            hospital,
                            batchNumber,
                            doctor,
                            reaction,
                            note,
                            createdBy: uId
                        }
                    });
                    return success(res, {
                        ...newRecord,
                        id: newRecord.id.toString(),
                        babyId: newRecord.babyId.toString()
                    });
                }
                const result = await prisma.babyVaccineSchedule.update({
                    where: { id: BigInt(id) },
                    data: {
                        vaccinationStatus: status || 'completed',
                        vaccineDate: vaccineDate ? new Date(vaccineDate) : new Date(),
                        hospital, note, batchNumber, doctor, reaction,
                        completedBy: uId, completedTime: new Date()
                    }
                });
                return success(res, {
                    ...result,
                    id: result.id.toString(),
                    babyId: result.babyId.toString(),
                    templateId: result.templateId?.toString() ?? null,
                    createdBy: result.createdBy?.toString() ?? null,
                    completedBy: result.completedBy?.toString() ?? null,
                });
            }

            if (req.method === 'PUT') {
                const { id, vaccineName, doseNumber, vaccineDate, hospital, batchNumber, doctor, reaction, note } = req.body;
                if (!id) return error(res, '记录 ID 缺失');
                const result = await prisma.babyVaccineSchedule.update({
                    where: { id: BigInt(id) },
                    data: {
                        vaccineName,
                        doseNumber,
                        vaccineDate: vaccineDate ? new Date(vaccineDate) : undefined,
                        hospital,
                        batchNumber,
                        doctor,
                        reaction,
                        note
                    }
                });
                return success(res, {
                    ...result,
                    id: result.id.toString(),
                    babyId: result.babyId.toString()
                });
            }

            if (req.method === 'DELETE') {
                const scheduleId = req.query.scheduleId as string;
                if (!scheduleId) return error(res, '记录 ID 缺失');
                await prisma.babyVaccineSchedule.delete({ where: { id: BigInt(scheduleId) } });
                return success(res, { message: '删除成功' });
            }
        }

        if (action === 'invite') {
            if (!babyId) return error(res, '参数错误');
            const bId = BigInt(babyId as string);
            if (!(await hasBabyPermission(uId, bId))) return error(res, '权限不足', 403);

            const token = jwt.sign(
                { babyId: bId.toString(), inviterId: uId.toString(), type: 'invite' },
                JWT_SECRET,
                { expiresIn: '7d' }
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
            } catch (e: any) {
                if (e.name === 'TokenExpiredError') {
                    return error(res, '邀请链接已过期，请联系邀请人重新生成');
                } else if (e.name === 'JsonWebTokenError') {
                    return error(res, '邀请链接无效');
                }
                return error(res, '邀请链接已过期或无效');
            }
        }

        return error(res, '请求无效', 404);
    } catch (err: any) {
        console.error('[Baby API] Error:', err?.message, err?.stack);
        return error(res, `处理失败: ${err?.message || '未知错误'}`, 500);
    }
}
