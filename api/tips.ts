import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId, forceAI } = req.query;
    
    try {
        let baby = null;
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

        // Handle case where no baby is added
        if (!baby) {
            prompt = `你是一位专业的育儿专家。目前用户还没有添加宝宝的信息，请提供3条通用的、针对新生儿到3岁阶段家长的科学育儿心理或日常通用建议。
            格式要求为JSON数组：[{"title": "...", "content": "...", "category": "general|psychology|development|safety"}]`;
        }

        let tips = [];
        // Only try to find local expert tips if baby is present and it's not a force AI request
        if (baby && forceAI !== 'true') {
            tips = await prisma.expertTip.findMany({
                where: {
                    minAgeMonth: { lte: babyAgeMonth },
                    maxAgeMonth: { gte: babyAgeMonth }
                },
                take: 3
            });
        }

        // AI Generation (Fallback or explicit request or No baby case)
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

                let aiTips = [];
                try {
                    // Clean AI response from markdown blocks
                    const jsonContent = aiResponse.insight.replace(/```json\n?|\n?```/g, '').trim();
                    aiTips = JSON.parse(jsonContent);
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

        // Final serialization check
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
