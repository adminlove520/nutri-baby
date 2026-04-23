import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';
import { success, error } from '../lib/utils';

// POST /api/ai/analyze
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { babyId, query } = req.body;
    console.log('[AI] analyze request, babyId:', babyId, 'type:', typeof babyId);

    try {
        let babyProfile: { name: string; gender: string; birthDate: Date; month: number } | undefined = undefined;
        let records: any = { feeding: [], sleep: [], growth: [], medication: [], health: [] };

        const babyIdStr = babyId != null ? String(babyId) : '';
        if (babyIdStr && babyIdStr !== 'null' && babyIdStr !== 'undefined') {
            const id = BigInt(babyIdStr);
            
            // Permissions check
            const hasPermission = await hasBabyPermission(user.userId, id);
            if (hasPermission) {
                // 1. Gather Context Data
                const baby = await prisma.baby.findUnique({
                    where: { id: id }
                });

                if (baby) {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                    const [feeding, sleep, growth, medication, health] = await Promise.all([
                        prisma.feedingRecord.findMany({
                            where: { babyId: id, time: { gte: sevenDaysAgo } },
                            orderBy: { time: 'desc' },
                            take: 10
                        }),
                        prisma.sleepRecord.findMany({
                            where: { babyId: id, startTime: { gte: sevenDaysAgo } },
                            orderBy: { startTime: 'desc' },
                            take: 10
                        }),
                        prisma.growthRecord.findMany({
                            where: { babyId: id, time: { gte: sevenDaysAgo } },
                            orderBy: { time: 'desc' },
                            take: 5
                        }),
                        prisma.medicationRecord.findMany({
                            where: { babyId: id, time: { gte: sevenDaysAgo } },
                            orderBy: { time: 'desc' },
                            take: 5
                        }),
                        prisma.healthRecord.findMany({
                            where: { babyId: id, time: { gte: sevenDaysAgo } },
                            orderBy: { time: 'desc' },
                            take: 5
                        })
                    ]);

                    // 精确计算月龄（小于1个月用天数表示）
                    const birthDateObj = new Date(baby.birthDate);
                    const now = new Date();
                    const diffMs = now.getTime() - birthDateObj.getTime();
                    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const months = Math.floor(days / 30);
                    babyProfile = {
                        name: baby.name,
                        gender: baby.gender,
                        birthDate: baby.birthDate,
                        month: months,
                        days: days,
                        ageStr: months >= 1 ? `${months}个月` : `${days}天`
                    };

                    // Serialize records for AI
                    const serialize = (data: any) => JSON.parse(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v));
                    records = {
                        feeding: serialize(feeding),
                        sleep: serialize(sleep),
                        growth: serialize(growth),
                        medication: serialize(medication),
                        health: serialize(health)
                    };
                }
            }
        }

        // 2. Call AI Provider
        const provider = AIFactory.createProvider();
        const result = await provider.analyze({
            babyProfile,
            recentRecords: records,
            query: babyProfile ? query : `(用户尚未添加宝宝或未选择宝宝，请提供通用的育儿或接种建议) ${query || ''}`
        });

        // Normalize: ensure recommendations is always a string array
        const normalized = {
            insight: result.insight || '',
            sentiment: result.sentiment || 'neutral',
            recommendations: Array.isArray(result.recommendations)
                ? result.recommendations
                : typeof result.recommendations === 'string'
                    ? (result.recommendations as string).split(/[;\n]/).map((s: string) => s.trim()).filter(Boolean)
                    : []
        };
        return success(res, normalized);

    } catch (err: any) {
        console.error('AI Analyze Error:', err);
        return res.status(500).json({ 
            message: 'Internal Server Error', 
            error: err.message,
            details: err.toString()
        });
    }
}

// Vercel function configuration
export const config = {
    maxDuration: 60, // 增加超时时间到 60s (Pro 支持，Hobby 限制在 10s 但设置无害)
};
