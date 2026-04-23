import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { success, error } from '../lib/utils';

// ─── WHO 生长标准数据（0-36 月，P3/P15/P50/P85/P97）───────────────────────────
// 来源: WHO Child Growth Standards (2006)
// 身高单位: cm，体重单位: kg，头围单位: cm

const WHO_HEIGHT_MALE = [
    // [month, p3, p15, p50, p85, p97]
    [0,  44.2, 46.1, 49.9, 52.3, 54.0],
    [1,  50.8, 52.8, 54.7, 56.6, 58.6],
    [2,  54.4, 56.4, 58.4, 60.4, 62.4],
    [3,  57.3, 59.4, 61.4, 63.5, 65.5],
    [4,  59.7, 61.8, 63.9, 66.0, 68.0],
    [5,  61.7, 63.8, 65.9, 68.0, 70.1],
    [6,  63.3, 65.5, 67.6, 69.8, 71.9],
    [7,  64.8, 67.0, 69.2, 71.3, 73.5],
    [8,  66.2, 68.4, 70.6, 72.8, 75.0],
    [9,  67.5, 69.7, 72.0, 74.2, 76.5],
    [10, 68.7, 71.0, 73.3, 75.6, 77.9],
    [11, 69.9, 72.2, 74.5, 76.9, 79.2],
    [12, 71.0, 73.4, 75.7, 78.1, 80.5],
    [15, 74.0, 76.6, 79.1, 81.7, 84.2],
    [18, 76.9, 79.6, 82.3, 85.0, 87.7],
    [21, 79.6, 82.4, 85.1, 88.0, 90.8],
    [24, 82.3, 85.1, 87.8, 90.9, 93.8],
    [27, 84.4, 87.3, 90.3, 93.2, 96.1],
    [30, 86.6, 89.6, 92.7, 95.7, 98.7],
    [33, 88.6, 91.8, 95.0, 98.1, 101.3],
    [36, 90.7, 93.9, 97.2, 100.5, 103.8],
];

const WHO_HEIGHT_FEMALE = [
    [0,  43.6, 45.4, 49.1, 51.6, 53.5],
    [1,  49.8, 51.7, 53.7, 55.6, 57.6],
    [2,  53.0, 55.0, 57.1, 59.1, 61.1],
    [3,  55.6, 57.7, 59.8, 61.9, 64.0],
    [4,  57.8, 59.9, 62.1, 64.3, 66.4],
    [5,  59.6, 61.8, 64.0, 66.2, 68.5],
    [6,  61.2, 63.5, 65.7, 68.0, 70.3],
    [7,  62.7, 65.0, 67.3, 69.6, 71.9],
    [8,  64.0, 66.4, 68.7, 71.1, 73.5],
    [9,  65.3, 67.7, 70.1, 72.6, 75.0],
    [10, 66.5, 69.0, 71.5, 74.0, 76.4],
    [11, 67.7, 70.2, 72.8, 75.3, 77.8],
    [12, 68.9, 71.4, 74.0, 76.7, 79.2],
    [15, 72.0, 74.8, 77.5, 80.3, 83.1],
    [18, 74.9, 77.8, 80.7, 83.7, 86.7],
    [21, 77.5, 80.5, 83.7, 86.8, 89.9],
    [24, 80.0, 83.2, 86.4, 89.7, 93.0],
    [27, 82.3, 85.5, 89.0, 92.5, 95.9],
    [30, 84.5, 87.9, 91.5, 95.1, 98.7],
    [33, 86.5, 90.0, 93.8, 97.5, 101.2],
    [36, 88.6, 92.2, 96.1, 99.9, 103.7],
];

const WHO_WEIGHT_MALE = [
    // [month, p3, p15, p50, p85, p97]
    [0,  2.5, 2.9, 3.3, 3.9, 4.4],
    [1,  3.4, 3.9, 4.5, 5.1, 5.8],
    [2,  4.3, 4.9, 5.6, 6.3, 7.1],
    [3,  5.0, 5.7, 6.4, 7.2, 8.0],
    [4,  5.6, 6.2, 7.0, 7.8, 8.7],
    [5,  6.0, 6.7, 7.5, 8.4, 9.3],
    [6,  6.4, 7.1, 7.9, 8.8, 9.8],
    [7,  6.7, 7.4, 8.3, 9.2, 10.2],
    [8,  6.9, 7.7, 8.6, 9.6, 10.7],
    [9,  7.1, 7.9, 8.9, 9.9, 11.0],
    [10, 7.4, 8.2, 9.2, 10.2, 11.4],
    [11, 7.6, 8.4, 9.4, 10.5, 11.7],
    [12, 7.7, 8.6, 9.6, 10.8, 12.0],
    [15, 8.3, 9.2, 10.3, 11.5, 12.8],
    [18, 8.8, 9.8, 10.9, 12.2, 13.7],
    [21, 9.2, 10.2, 11.5, 12.9, 14.5],
    [24, 9.7, 10.8, 12.2, 13.6, 15.3],
    [27, 10.0, 11.2, 12.6, 14.1, 15.9],
    [30, 10.4, 11.6, 13.0, 14.6, 16.5],
    [33, 10.7, 12.0, 13.5, 15.1, 17.1],
    [36, 11.0, 12.4, 14.3, 16.2, 18.3],
];

const WHO_WEIGHT_FEMALE = [
    [0,  2.4, 2.8, 3.2, 3.7, 4.2],
    [1,  3.2, 3.6, 4.2, 4.8, 5.5],
    [2,  3.9, 4.5, 5.1, 5.8, 6.6],
    [3,  4.5, 5.2, 5.8, 6.6, 7.5],
    [4,  5.0, 5.7, 6.4, 7.3, 8.2],
    [5,  5.4, 6.1, 6.9, 7.8, 8.8],
    [6,  5.7, 6.5, 7.3, 8.2, 9.3],
    [7,  6.0, 6.8, 7.6, 8.6, 9.8],
    [8,  6.3, 7.0, 7.9, 9.0, 10.2],
    [9,  6.5, 7.3, 8.2, 9.3, 10.5],
    [10, 6.7, 7.5, 8.5, 9.6, 10.9],
    [11, 6.9, 7.7, 8.7, 9.9, 11.2],
    [12, 7.0, 7.9, 8.9, 10.1, 11.5],
    [15, 7.6, 8.5, 9.6, 10.9, 12.4],
    [18, 8.1, 9.1, 10.2, 11.6, 13.2],
    [21, 8.6, 9.6, 10.9, 12.3, 14.0],
    [24, 9.0, 10.2, 11.5, 13.0, 14.8],
    [27, 9.4, 10.6, 12.0, 13.6, 15.5],
    [30, 9.8, 11.0, 12.5, 14.1, 16.1],
    [33, 10.1, 11.4, 12.9, 14.7, 16.8],
    [36, 10.8, 12.2, 14.2, 16.3, 18.5],
];

// 将原始数组转换为数据库写入格式
function buildStandardRows(data: number[][], gender: string, type: string, unit: string) {
    return data.map(([month, p3, p15, p50, p85, p97]) => ({
        gender,
        type,
        month,
        p3,
        p15,
        p50,
        p85,
        p97,
        source: 'WHO',
        unit,
    }));
}

const ALL_STANDARDS = [
    ...buildStandardRows(WHO_HEIGHT_MALE,   'male',   'height', 'cm'),
    ...buildStandardRows(WHO_HEIGHT_FEMALE, 'female', 'height', 'cm'),
    ...buildStandardRows(WHO_WEIGHT_MALE,   'male',   'weight', 'kg'),
    ...buildStandardRows(WHO_WEIGHT_FEMALE, 'female', 'weight', 'kg'),
];

// ─── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return error(res, '请先登录', 401);
    const uId = BigInt(user.userId);

    const { action, babyId, range = '7' } = req.query;

    // ── 单独路由：初始化 WHO 标准数据（不需要 babyId）──────────────────────────
    if (action === 'seed_standards') {
        try {
            const model = (prisma as any).growthStandard;
            if (!model) throw new Error('growthStandard model missing in Prisma client');

            let inserted = 0;
            for (const row of ALL_STANDARDS) {
                await model.upsert({
                    where: { gender_type_month_source: { gender: row.gender, type: row.type, month: row.month, source: row.source } },
                    update: { p3: row.p3, p15: row.p15, p50: row.p50, p85: row.p85, p97: row.p97, unit: row.unit },
                    create: row,
                });
                inserted++;
            }
            return success(res, { message: `WHO 标准数据写入完成，共 ${inserted} 条` });
        } catch (err: any) {
            console.error('[Stats] seed_standards error:', err?.message);
            return error(res, `写入失败: ${err?.message}`, 500);
        }
    }

    // ── 以下路由需要 babyId ────────────────────────────────────────────────────
    if (!babyId || babyId === 'null' || babyId === 'undefined') return error(res, '宝宝 ID 缺失');

    let bId: bigint;
    try {
        bId = BigInt(babyId as string);
    } catch (e) {
        return error(res, '宝宝 ID 格式不正确');
    }

    if (!(await hasBabyPermission(uId, bId))) return error(res, '权限不足', 403);

    try {
            // ── 返回 WHO 标准数据（按性别过滤）────────────────────────────────────
        if (action === 'standards') {
            const { type, gender } = req.query;
            const model = (prisma as any).growthStandard;
            if (!model) {
                console.warn('[Stats] growthStandard model is missing from Prisma client');
                return success(res, []);
            }
            const standards = await model.findMany({
                where: {
                    gender: (gender as string) || 'male',
                    ...(type ? { type: type as string } : {}),
                    source: 'WHO',
                },
                orderBy: [{ type: 'asc' }, { month: 'asc' }],
            });
            return success(res, standards);
        }

        // 北京时间今日起始
        const offset = 8;
        const getStartOfToday = () => {
            const date = new Date();
            const beijingTime = new Date(date.getTime() + offset * 60 * 60 * 1000);
            beijingTime.setUTCHours(0, 0, 0, 0);
            return new Date(beijingTime.getTime() - offset * 60 * 60 * 1000);
        };

        // ── Charts: 趋势图数据 ──────────────────────────────────────────────
        if (action === 'charts') {
            const days = parseInt(range as string) || 7;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            startDate.setHours(0, 0, 0, 0);

            const [feedingRecords, sleepRecords, growthRecords, medicationRecords, healthRecords, baby] = await Promise.all([
                prisma.feedingRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } }),
                prisma.sleepRecord.findMany({ where: { babyId: bId, startTime: { gte: startDate } }, orderBy: { startTime: 'asc' } }),
                prisma.growthRecord.findMany({ where: { babyId: bId }, orderBy: { time: 'asc' } }), // 成长记录全量（不按天过滤）
                prisma.medicationRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } }),
                prisma.healthRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } }),
                prisma.baby.findUnique({ where: { id: bId } }),
            ]);

            const toNum = (v: any) => v == null ? 0 : (typeof v.toNumber === 'function' ? v.toNumber() : Number(v));

            // 奶量按天聚合
            const dailyFeeding: Record<string, number> = {};
            feedingRecords.forEach(r => {
                const date = r.time.toISOString().split('T')[0];
                dailyFeeding[date] = (dailyFeeding[date] || 0) + toNum(r.amount);
            });

            // 睡眠按天聚合（分钟）
            const dailySleep: Record<string, number> = {};
            sleepRecords.forEach(r => {
                const date = r.startTime.toISOString().split('T')[0];
                const minutes = r.duration != null
                    ? toNum(r.duration)
                    : (r.endTime ? Math.floor((r.endTime.getTime() - r.startTime.getTime()) / 60000) : 0);
                dailySleep[date] = (dailySleep[date] || 0) + minutes;
            });

            // 宝宝月龄计算
            const birthDate = baby?.birthDate ? new Date(baby.birthDate) : null;
            const getMonth = (time: Date) => {
                if (!birthDate) return 0;
                const diff = time.getTime() - birthDate.getTime();
                return Math.floor(diff / (30.4375 * 24 * 60 * 60 * 1000)); // 平均月长
            };

            // 拉取该宝宝性别对应的 WHO 标准
            const gender = baby?.gender || 'male';
            const model = (prisma as any).growthStandard;
            let standards = [];
            if (model) {
                standards = await model.findMany({
                    where: { gender, source: 'WHO' },
                    orderBy: [{ type: 'asc' }, { month: 'asc' }],
                });
            } else {
                console.warn('[Stats] growthStandard model missing, charts will have no WHO baseline');
            }

            return success(res, {
                feeding: Object.entries(dailyFeeding).map(([date, amount]) => ({ date, amount })),
                sleep: Object.entries(dailySleep).map(([date, minutes]) => ({
                    date,
                    hours: parseFloat((minutes / 60).toFixed(1)),
                })),
                growth: growthRecords.map(r => ({
                    date: r.time.toISOString().split('T')[0],
                    month: getMonth(r.time),
                    height: r.height ? Number(r.height) : null,
                    weight: r.weight ? Number(r.weight) : null,
                    head: r.headCircumference ? Number(r.headCircumference) : null,
                    imageUrl: r.imageUrl,
                    note: r.note,
                })),
                medication: medicationRecords.map(r => ({
                    date: r.time.toISOString().split('T')[0],
                    name: r.name,
                    dosage: r.dosage,
                })),
                health: healthRecords.map(r => ({
                    date: r.time.toISOString().split('T')[0],
                    type: r.type,
                    value: r.value ? Number(r.value) : null,
                    symptoms: r.symptoms,
                })),
                // 按 type 分组返回，前端直接使用
                standards: {
                    height: standards.filter((s: any) => s.type === 'height').map((s: any) => ({
                        month: s.month, p3: s.p3, p15: s.p15, p50: s.p50, p85: s.p85, p97: s.p97,
                    })),
                    weight: standards.filter((s: any) => s.type === 'weight').map((s: any) => ({
                        month: s.month, p3: s.p3, p15: s.p15, p50: s.p50, p85: s.p85, p97: s.p97,
                    })),
                },
                babyGender: gender,
            });
        }

        // ── Default: 今日概览 ───────────────────────────────────────────────
        const startOfToday = getStartOfToday();
        console.log(`[DEBUG Stats] bId: ${bId}, startOfToday: ${startOfToday.toISOString()}`);

        const [feedingToday, sleepToday, diaperToday, latestGrowth, userData] = await Promise.all([
            prisma.feedingRecord.findMany({ where: { babyId: bId, time: { gte: startOfToday } }, orderBy: { time: 'asc' } }),
            prisma.sleepRecord.findMany({ where: { babyId: bId, startTime: { gte: startOfToday } }, orderBy: { startTime: 'asc' } }),
            prisma.diaperRecord.findMany({ where: { babyId: bId, time: { gte: startOfToday } }, orderBy: { time: 'asc' } }),
            prisma.growthRecord.findFirst({ where: { babyId: bId }, orderBy: { time: 'desc' } }),
            prisma.user.findUnique({ where: { id: uId }, select: { createdAt: true } }),
        ]);

        const toNum = (v: any) => v == null ? 0 : (typeof v.toNumber === 'function' ? v.toNumber() : Number(v));
        const totalMl = feedingToday.reduce((acc, curr) => acc + toNum(curr.amount), 0);
        const totalSleepMinutes = sleepToday.reduce((acc, curr) => {
            const dur = curr.duration != null
                ? toNum(curr.duration)
                : (curr.endTime ? Math.floor((curr.endTime.getTime() - curr.startTime.getTime()) / 60000) : 0);
            return acc + dur;
        }, 0);

        // 获取最后一次喂奶时间（feedingToday 已按 time 'asc' 排序）
        const lastFeeding = feedingToday.length > 0
            ? feedingToday[feedingToday.length - 1].time
            : null;

        const userCreatedAt = userData?.createdAt ? new Date(userData.createdAt).getTime() : null;
        const diffDays = userCreatedAt ? Math.floor((Date.now() - userCreatedAt) / (1000 * 60 * 60 * 24)) : null;
        const joinDays = diffDays !== null && diffDays >= 0 ? Math.max(1, diffDays) : 1;

        console.log('[DEBUG Stats] joinDays calculation:', {
            userDataCreatedAt: userData?.createdAt,
            userCreatedAt,
            now: Date.now(),
            diffDays,
            result: joinDays
        });

        return success(res, {
            today: {
                feeding: { totalCount: feedingToday.length, bottleMl: totalMl, lastFeedingTime: lastFeeding },
                sleep: { totalMinutes: totalSleepMinutes },
                diaper: { totalCount: diaperToday.length },
                growth: {
                    latestHeight: latestGrowth?.height ? Number(latestGrowth.height) : 0,
                    latestWeight: latestGrowth?.weight ? Number(latestGrowth.weight) : 0,
                },
            },
            joinDays,
        });

    } catch (err: any) {
        console.error('[Stats] Unhandled error:', err?.message, err);
        return error(res, `统计数据加载失败: ${err?.message || '未知错误'}`, 500);
    }
}
