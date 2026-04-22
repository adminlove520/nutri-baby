import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { success, error } from '../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return error(res, '请先登录', 401);
    const uId = BigInt(user.userId);

    const { action, babyId, range = '7' } = req.query;
    if (!babyId) return error(res, '宝宝 ID 缺失');
    
    const bId = BigInt(babyId as string);
    if (!(await hasBabyPermission(uId, bId))) return error(res, '权限不足', 403);

    try {
        if (action === 'standards') {
            const { type, gender } = req.query;
            const standards = await prisma.growthStandard.findMany({
                where: { 
                    gender: (gender as string) || 'male', 
                    type: (type as string) || 'height',
                    source: 'WHO' 
                },
                orderBy: { month: 'asc' }
            });
            return success(res, standards);
        }

        if (action === 'charts') {
            const days = parseInt(range as string);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const [feedingRecords, sleepRecords, growthRecords] = await Promise.all([
                prisma.feedingRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } }),
                prisma.sleepRecord.findMany({ where: { babyId: bId, startTime: { gte: startDate } }, orderBy: { startTime: 'asc' } }),
                prisma.growthRecord.findMany({ where: { babyId: bId, time: { gte: startDate } }, orderBy: { time: 'asc' } })
            ]);

            const dailyFeeding: Record<string, number> = {};
            feedingRecords.forEach(r => {
                const date = r.time.toISOString().split('T')[0];
                dailyFeeding[date] = (dailyFeeding[date] || 0) + (r.amount || 0);
            });

            const dailySleep: Record<string, number> = {};
            sleepRecords.forEach(r => {
                const date = r.startTime.toISOString().split('T')[0];
                const minutes = r.duration || (r.endTime ? Math.floor((r.endTime.getTime() - r.startTime.getTime()) / 60000) : 0);
                dailySleep[date] = (dailySleep[date] || 0) + minutes;
            });

            const baby = await prisma.baby.findUnique({ where: { id: bId } });
            const standards = await prisma.growthStandard.findMany({
                where: { gender: baby?.gender || 'male', source: 'WHO' },
                orderBy: { month: 'asc' }
            });

            return success(res, {
                feeding: Object.entries(dailyFeeding).map(([date, amount]) => ({ date, amount })),
                sleep: Object.entries(dailySleep).map(([date, minutes]) => ({ date, hours: parseFloat((minutes / 60).toFixed(1)) })),
                growth: growthRecords.map(r => ({
                    date: r.time.toISOString().split('T')[0],
                    month: Math.floor((r.time.getTime() - new Date(baby?.birthDate || '').getTime()) / (30 * 24 * 60 * 60 * 1000)),
                    height: r.height ? Number(r.height) : null,
                    weight: r.weight ? Number(r.weight) : null,
                    head: r.headCircumference ? Number(r.headCircumference) : null
                })),
                standards: standards.map(s => ({ month: s.month, type: s.type, p3: Number(s.p3), p15: Number(s.p15), p50: Number(s.p50), p85: Number(s.p85), p97: Number(s.p97) }))
            });
        }

        // Default: Today Summary
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const [feedingToday, sleepToday, diaperToday, latestGrowth] = await Promise.all([
            prisma.feedingRecord.findMany({ where: { babyId: bId, time: { gte: startOfToday } } }),
            prisma.sleepRecord.findMany({ where: { babyId: bId, startTime: { gte: startOfToday } } }),
            prisma.diaperRecord.findMany({ where: { babyId: bId, time: { gte: startOfToday } } }),
            prisma.growthRecord.findFirst({ where: { babyId: bId }, orderBy: { time: 'desc' } })
        ]);

        const totalMl = feedingToday.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const totalSleepMinutes = sleepToday.reduce((acc, curr) => acc + (curr.duration || (curr.endTime ? Math.floor((curr.endTime.getTime() - curr.startTime.getTime()) / 60000) : 0)), 0);
        const lastFeeding = feedingToday.length > 0 ? feedingToday[feedingToday.length - 1].time : null;

        return success(res, {
            today: {
                feeding: { totalCount: feedingToday.length, bottleMl: totalMl, lastFeedingTime: lastFeeding },
                sleep: { totalMinutes: totalSleepMinutes },
                diaper: { totalCount: diaperToday.length },
                growth: { latestHeight: latestGrowth?.height ? Number(latestGrowth.height) : 0, latestWeight: latestGrowth?.weight ? Number(latestGrowth.weight) : 0 }
            }
        });
    } catch (err) {
        console.error('Statistics API Error:', err);
        return error(res, '统计数据加载失败', 500);
    }
}
