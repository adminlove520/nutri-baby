import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';
import { success, error } from '../lib/utils';

// POST /api/ai/analyze - AI analysis with baby context
// GET /api/ai?action=tips - Get AI-powered daily tips
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // GET - Tips functionality (merged from tips.ts)
    if (req.method === 'GET' && req.query.action === 'tips') {
        const { babyId, forceAI } = req.query;

        try {
            let baby: any = null;
            let babyAgeMonth = -1;
            let prompt = '';

            if (babyId && babyId !== 'null' && babyId !== 'undefined') {
                const bId = BigInt(babyId.toString());
                const hasPermission = await hasBabyPermission(user.userId, bId);

                if (hasPermission) {
                    baby = await prisma.baby.findUnique({ where: { id: bId } });
                    if (baby) {
                        babyAgeMonth = Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000));
                        prompt = `你是一位专业的育儿专家。请针对一位 ${babyAgeMonth} 个月大的宝宝（性别：${baby.gender === 'male' ? '男' : '女'}），提供3条科学、具体的每日育儿建议。
                        格式要求为JSON数组：[{"title": "...", "content": "...", "category": "feeding|sleep|development|safety"}]`;
                    }
                }
            }

            if (!baby) {
                prompt = `你是一位专业的育儿专家。目前用户还没有添加宝宝的信息，请提供3条通用的、针对新生儿到3岁阶段家长的科学育儿心理或日常通用建议。
                格式要求为JSON数组：[{"title": "...", "content": "...", "category": "general|psychology|development|safety"}]`;
            }

            let tips: any[] = [];
            if (baby && forceAI !== 'true') {
                tips = await prisma.expertTip.findMany({
                    where: {
                        minAgeMonth: { lte: babyAgeMonth },
                        maxAgeMonth: { gte: babyAgeMonth }
                    },
                    take: 3
                });
            }

            if (tips.length === 0 || forceAI === 'true' || !baby) {
                try {
                    const ai = AIFactory.createProvider();
                    const aiResponse = await ai.analyze({
                        babyProfile: baby ? {
                            name: baby.name,
                            birthDate: baby.birthDate,
                            gender: baby.gender,
                            month: babyAgeMonth
                        } : undefined,
                        recentRecords: { feeding: [], sleep: [], growth: [] },
                        query: prompt
                    });

                    let aiTips: any[] = [];
                    try {
                        let cleanJson = aiResponse.insight.trim();
                        if (cleanJson.startsWith('```')) {
                            const match = cleanJson.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
                            if (match && match[1]) {
                                cleanJson = match[1].trim();
                            }
                        }
                        aiTips = JSON.parse(cleanJson);
                    } catch (e) {
                        aiTips = [{ title: baby ? '宝宝专属建议' : '科学育儿建议', content: aiResponse.insight, category: 'general' }];
                    }

                    if (Array.isArray(aiTips)) {
                        tips = aiTips;
                    }
                } catch (aiErr) {
                    console.error('AI Tips Error:', aiErr);
                    tips = [{ title: '欢迎开启育儿之旅', content: '请先在"宝宝设置"中添加宝宝信息，获取更精准的每日建议。', category: 'general' }];
                }
            }

            const safeTips = tips.map((t: any, idx) => ({
                id: t.id?.toString() || `ai-${idx}`,
                title: t.title,
                description: t.content || t.description,
                type: t.category,
                priority: baby ? 'high' : 'medium'
            }));

            return res.status(200).json(safeTips);
        } catch (error: any) {
            console.error('Tips API Error:', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }

    // POST - AI Analysis
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { babyId, query } = req.body;

    try {
        let babyProfile: { name: string; gender: string; birthDate: Date; month: number; days: number; ageStr: string } | undefined = undefined;
        let records: any = { feeding: [], sleep: [], growth: [], medication: [], health: [] };

        const babyIdStr = babyId != null ? String(babyId) : '';
        if (babyIdStr && babyIdStr !== 'null' && babyIdStr !== 'undefined') {
            const id = BigInt(babyIdStr);

            const hasPermission = await hasBabyPermission(user.userId, id);
            if (hasPermission) {
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

        const provider = AIFactory.createProvider();
        const result = await provider.analyze({
            babyProfile,
            recentRecords: records,
            query: babyProfile ? query : `(用户尚未添加宝宝或未选择宝宝，请提供通用的育儿或接种建议) ${query || ''}`
        });

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

export const config = {
    maxDuration: 60,
};
