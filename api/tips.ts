import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';

import { AIFactory } from '../lib/ai/factory';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId, forceAI } = req.query;
    if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

    const bId = BigInt(babyId as string);
    if (!(await hasBabyPermission(user.userId, bId))) return res.status(403).json({ message: 'Forbidden' });

    try {
        const baby = await prisma.baby.findUnique({ where: { id: bId } });
        if (!baby) return res.status(404).json({ message: 'Baby not found' });

        const babyAgeMonth = Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000));

        let tips = [];
        if (forceAI !== 'true') {
            tips = await prisma.expertTip.findMany({
                where: {
                    minAgeMonth: { lte: babyAgeMonth },
                    maxAgeMonth: { gte: babyAgeMonth }
                },
                take: 3
            });
        }

        // AI Fallback or Force AI
        if (tips.length === 0 || forceAI === 'true') {
            try {
                const ai = AIFactory.createProvider();
                const prompt = `你是一位专业的育儿专家。请针对一位 ${babyAgeMonth} 个月大的宝宝（性别：${baby.gender === 'male' ? '男' : '女'}），提供3条科学、具体的每日育儿建议。
                格式要求为JSON数组：[{"title": "...", "content": "...", "category": "feeding|sleep|development|safety"}]`;
                
                const aiResponse = await ai.analyze({
                    babyProfile: { name: baby.name, birthDate: baby.birthDate, gender: baby.gender },
                    recentRecords: { feeding: [], sleep: [], growth: [] },
                    query: prompt
                });

                let aiTips = [];
                try {
                    aiTips = JSON.parse(aiResponse.insight);
                } catch (e) {
                    // If not JSON, try to wrap the insight
                    aiTips = [{ title: 'AI 育儿建议', content: aiResponse.insight, category: 'general' }];
                }
                
                if (Array.isArray(aiTips)) {
                    tips = aiTips;
                }
            } catch (aiErr) {
                console.error('AI Tips Error:', aiErr);
                // Last fallback
                tips = [{ title: '关注宝宝的日常变化', content: '每个宝宝都有自己的成长节奏，多观察宝宝的情绪和需求。', category: 'general' }];
            }
        }

        return res.status(200).json(tips.map((t, idx) => ({
            id: t.id?.toString() || `ai-${idx}`,
            title: t.title,
            description: t.content,
            type: t.category,
            priority: 'medium'
        })));
    } catch (error) {
        console.error('Tips API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
