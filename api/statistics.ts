import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { success, error } from '../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return error(res, '请先登录', 401);
    const uId = BigInt(user.userId);

    const { action, babyId, range = '7', tz = '8' } = req.query;
    if (!babyId || babyId === 'null' || babyId === 'undefined') return error(res, '宝宝 ID 缺失');
    
    let bId: bigint;
    try {
        bId = BigInt(babyId as string);
    } catch (e) {
        console.error('[Stats] Invalid babyId format:', babyId);
        return error(res, '宝宝 ID 格式不正确');
    }

    if (!(await hasBabyPermission(uId, bId))) return error(res, '权限不足', 403);

    try {
        if (action === 'standards') {
            // GrowthStandard model not in schema yet — return empty array
            return success(res, []);
        }

        // 强制使用北京时间 (UTC+8)
        const offset = 8;
        const getStartOfToday = () => {
            const date = new Date();
            // 获取当前时间的 UTC 毫秒数，加上 8 小时偏移，计算出北京时间的 0 点
            const beijingTime = new Date(date.getTime() + (offset * 60 * 60 * 1000));
            beijingTime.setUTCHours(0, 0, 0, 0);
            // 转回原始 UTC 时间用于 Prisma 查询
            return new Date(beijingTime.getTime() - (offset * 60 * 60 * 1000));
        };

        if (action === 'charts') {
            const days = parseInt(range as string) || 7;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            startDate.setHours(0, 0, 0, 0);

            const [feedingRecords, sleepRecords, growthRecords, medicationRecords, healthRecords, baby] = await Promise.all([
                prisma.feedingRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } }),
                prisma.sleepRecord.findMany({ where: { babyId: bId, startTime: { gte: startDate } }, orderBy: { startTime: 'asc' } }),
                prisma.growthRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } }),
                prisma.medicationRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } }),
                prisma.healthRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } }),
                prisma.baby.findUnique({ where: { id: bId } })
            ]);

            // GrowthStandard model not in schema yet
            const genderedStandards: any[] = [];

            const dailyFeeding: Record<string, number> = {};
            const toNum = (v: any) => v == null ? 0 : (typeof v.toNumber === 'function' ? v.toNumber() : Number(v));
            feedingRecords.forEach(r => {
                const date = r.time.toISOString().split('T')[0];
                dailyFeeding[date] = (dailyFeeding[date] || 0) + toNum(r.amount);
            });

            const dailySleep: Record<string, number> = {};
            sleepRecords.forEach(r => {
                const date = r.startTime.toISOString().split('T')[0];
                const minutes = r.duration != null ? toNum(r.duration) : (r.endTime ? Math.floor((r.endTime.getTime() - r.startTime.getTime()) / 60000) : 0);
                dailySleep[date] = (dailySleep[date] || 0) + minutes;
            });

            return success(res, {
                feeding: Object.entries(dailyFeeding).map(([date, amount]) => ({ date, amount })),
                sleep: Object.entries(dailySleep).map(([date, minutes]) => ({ date, hours: parseFloat((minutes / 60).toFixed(1)) })),
                growth: growthRecords.map(r => ({
                    date: r.time.toISOString().split('T')[0],
                    month: Math.floor((r.time.getTime() - new Date(baby?.birthDate || '').getTime()) / (30 * 24 * 60 * 60 * 1000)),
                    height: r.height ? Number(r.height) : null,
                    weight: r.weight ? Number(r.weight) : null,
                    head: r.headCircumference ? Number(r.headCircumference) : null,
                    imageUrl: r.imageUrl,
                    note: r.note
                })),
                medication: medicationRecords.map(r => ({
                    date: r.time.toISOString().split('T')[0],
                    name: r.name,
                    dosage: r.dosage
                })),
                health: healthRecords.map(r => ({
                    date: r.time.toISOString().split('T')[0],
                    type: r.type,
                    value: r.value ? Number(r.value) : null,
                    symptoms: r.symptoms
                })),
                standards: genderedStandards.map(s => ({ month: s.month, type: s.type, p3: Number(s.p3), p15: Number(s.p15), p50: Number(s.p50), p85: Number(s.p85), p97: Number(s.p97) }))
            });
        }

        // Default: Today Summary
        const startOfToday = getStartOfToday();
        console.log(`[Stats] Local today start (TZ ${offset}): ${startOfToday.toISOString()}`);

        const [feedingToday, sleepToday, diaperToday, latestGrowth, userData] = await Promise.all([
            prisma.feedingRecord.findMany({ where: { babyId: bId, time: { gte: startOfToday } } }),
            prisma.sleepRecord.findMany({ where: { babyId: bId, startTime: { gte: startOfToday } } }),
            prisma.diaperRecord.findMany({ where: { babyId: bId, time: { gte: startOfToday } } }),
            prisma.growthRecord.findFirst({ where: { babyId: bId }, orderBy: { time: 'desc' } }),
            prisma.user.findUnique({ where: { id: uId }, select: { createdAt: true } })
        ]);

        // Safely convert Prisma Decimal/null to number
        const toNum = (v: any) => v == null ? 0 : (typeof v.toNumber === 'function' ? v.toNumber() : Number(v));
        const totalMl = feedingToday.reduce((acc, curr) => acc + toNum(curr.amount), 0);
        const totalSleepMinutes = sleepToday.reduce((acc, curr) => {
            const dur = curr.duration != null ? toNum(curr.duration) : (curr.endTime ? Math.floor((curr.endTime.getTime() - curr.startTime.getTime()) / 60000) : 0);
            return acc + dur;
        }, 0);
        const lastFeeding = feedingToday.length > 0 ? feedingToday[feedingToday.length - 1].time : null;
        const joinDays = userData ? Math.floor((new Date().getTime() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return success(res, {
            today: {
                feeding: { totalCount: feedingToday.length, bottleMl: totalMl, lastFeedingTime: lastFeeding },
                sleep: { totalMinutes: totalSleepMinutes },
                diaper: { totalCount: diaperToday.length },
                growth: { latestHeight: latestGrowth?.height ? Number(latestGrowth.height) : 0, latestWeight: latestGrowth?.weight ? Number(latestGrowth.weight) : 0 }
            },
            joinDays
        });
    } catch (err: any) {
        console.error('[Stats] Unhandled error:', err?.message, err?.stack);
        // 特别处理 BigInt 序列化错误
        if (err?.message?.includes('BigInt') || err?.message?.includes('serialize')) {
            return error(res, '数据序列化错误，请联系管理员', 500);
        }
        return error(res, `统计数据加载失败: ${err?.message || '未知错误'}`, 500);
    }
}
