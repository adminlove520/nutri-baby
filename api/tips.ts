import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId } = req.query;
    if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

    const bId = BigInt(babyId as string);
    if (!(await hasBabyPermission(user.userId, bId))) return res.status(403).json({ message: 'Forbidden' });

    try {
        const baby = await prisma.baby.findUnique({ where: { id: bId } });
        if (!baby) return res.status(404).json({ message: 'Baby not found' });

        const babyAgeMonth = Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000));

        const tips = await prisma.expertTip.findMany({
            where: {
                minAgeMonth: { lte: babyAgeMonth },
                maxAgeMonth: { gte: babyAgeMonth }
            },
            take: 3
        });

        // If no tips found, return a generic one or trigger AI (placeholder)
        if (tips.length === 0) {
            return res.status(200).json([
                {
                    title: '关注宝宝的日常变化',
                    content: '每个宝宝都有自己的成长节奏，多观察宝宝的情绪和需求。',
                    category: 'general'
                }
            ]);
        }

        return res.status(200).json(tips.map(t => ({
            id: t.id.toString(),
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
