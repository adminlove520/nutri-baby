import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';
import { success, error } from '../lib/utils';

// 小溪系统提示词
const XIAOXI_SYSTEM_PROMPT = `你是小溪 🦞，一位温暖、有爱的智能育儿助手。

## 核心身份
- 名字：小溪
- 专属于景皓，是他的 AI 好伙伴
- 性格：温暖、专业、诚实、偶尔俏皮

## 专业知识
1. **儿科医学专家** 🏥
   - 婴幼儿健康评估、疾病预防
   - 科学喂养指导（母乳、配方奶、辅食）
   - 睡眠问题诊断与改善

2. **妇产科护理专家** 👩‍⚕️
   - 孕期营养与护理
   - 产后恢复指导
   - 0-1岁宝宝日常护理

3. **母婴产品评测专家** 🛒
   - 奶粉、尿布、婴儿车、安全座椅
   - 玩具、绘本、早教用品
   - 客观分析，兼顾专业测评和真实用户反馈

4. **早教发展专家** 📚
   - 0-3岁各月龄发育指标
   - 感统训练、智力启蒙
   - 亲子互动游戏设计

## 回答原则
1. **专业但接地气** - 用通俗语言解释专业知识
2. **个性化建议** - 结合宝宝月龄、性别给出针对性建议
3. **产品推荐要客观** - 兼顾专业测评和真实用户反馈，注明"非广告"
4. **医疗边界意识** - 涉及诊断治疗时提醒"请咨询专业医生"
5. **温暖陪伴感** - 像姐姐一样耐心，像朋友一样贴心

## 口头禅
- "这个问题问得好～"
- "让我帮您查查"
- "作为参考..."`;

// 获取宝宝信息用于个性化
async function getBabyContext(userId: BigInt, babyId?: BigInt) {
    if (!babyId) {
        // 获取用户的第一个宝宝
        const babies = await prisma.baby.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            take: 1
        });
        if (babies.length > 0) {
            const baby = babies[0];
            const birthDate = new Date(baby.birthDate);
            const now = new Date();
            const days = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
            const months = Math.floor(days / 30);
            return {
                name: baby.name,
                gender: baby.gender === 'male' ? '男宝宝' : '女宝宝',
                month: months,
                days,
                ageStr: months >= 1 ? `${months}个月` : `${days}天`
            };
        }
        return null;
    }

    const baby = await prisma.baby.findUnique({ where: { id: babyId } });
    if (!baby) return null;

    const birthDate = new Date(baby.birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);

    return {
        name: baby.name,
        gender: baby.gender === 'male' ? '男宝宝' : '女宝宝',
        month: months,
        days,
        ageStr: months >= 1 ? `${months}个月` : `${days}天`
    };
}

// 构建带宝宝上下文的提示词
function buildPrompt(babyContext: any | null, userMessage: string) {
    let context = '';
    if (babyContext) {
        context = `
## 当前宝宝信息
- 名字：${babyContext.name}
- 性别：${babyContext.gender}
- 月龄：${babyContext.month}个月（${babyContext.days}天）

请根据宝宝信息给出个性化建议。
`;
    }

    return `${XIAOXI_SYSTEM_PROMPT}

${context}

## 用户问题
${userMessage}

请用温暖、专业的语气回答。`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS 预检
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    const user = await getUserFromRequest(req);
    if (!user) {
        return error(res, 'Unauthorized', 401);
    }

    const uId = BigInt(user.userId);

    // GET - 获取对话列表或对话详情
    if (req.method === 'GET') {
        const { conversationId, page = '1', limit = '20' } = req.query;

        try {
            if (conversationId) {
                // 获取单个对话详情
                const convId = BigInt(conversationId as string);
                const conv = await prisma.chatConversation.findUnique({
                    where: { id: convId },
                    include: {
                        baby: { select: { id: true, name: true, birthDate: true, gender: true } },
                        messages: {
                            orderBy: { createdAt: 'asc' },
                            select: {
                                id: true,
                                role: true,
                                content: true,
                                model: true,
                                tokens: true,
                                createdAt: true
                            }
                        }
                    }
                });

                if (!conv) {
                    return error(res, '对话不存在', 404);
                }

                // 检查权限
                if (conv.userId !== uId) {
                    return error(res, '无权访问', 403);
                }

                return success(res, {
                    ...conv,
                    id: conv.id.toString(),
                    userId: conv.userId.toString(),
                    babyId: conv.babyId?.toString() ?? null,
                    messages: conv.messages.map(m => ({
                        ...m,
                        id: m.id.toString(),
                        conversationId: conv.id.toString()
                    }))
                });
            }

            // 获取对话列表
            const pageNum = parseInt(page as string) || 1;
            const limitNum = Math.min(parseInt(limit as string) || 20, 50);
            const skip = (pageNum - 1) * limitNum;

            const [conversations, total] = await Promise.all([
                prisma.chatConversation.findMany({
                    where: { userId: uId },
                    orderBy: [
                        { isPinned: 'desc' },
                        { updatedAt: 'desc' }
                    ],
                    select: {
                        id: true,
                        title: true,
                        isPinned: true,
                        baby: { select: { id: true, name: true } },
                        createdAt: true,
                        updatedAt: true,
                        _count: { select: { messages: true } }
                    },
                    skip,
                    take: limitNum
                }),
                prisma.chatConversation.count({ where: { userId: uId } })
            ]);

            return success(res, {
                conversations: conversations.map(c => ({
                    ...c,
                    id: c.id.toString(),
                    babyId: c.baby?.id?.toString() ?? null,
                    babyName: c.baby?.name ?? null,
                    messageCount: c._count.messages
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
        } catch (err: any) {
            console.error('Get conversations error:', err);
            return error(res, '获取对话失败: ' + err.message, 500);
        }
    }

    // POST - 发送消息
    if (req.method === 'POST') {
        const { conversationId, message, babyId } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return error(res, '消息内容不能为空', 400);
        }

        const messageContent = message.trim();

        try {
            // 获取宝宝上下文
            const babyContext = await getBabyContext(uId, babyId ? BigInt(babyId) : undefined);

            // 获取或创建对话
            let convId: BigInt;
            let conversation: any;

            if (conversationId) {
                // 使用已有对话
                convId = BigInt(conversationId);
                conversation = await prisma.chatConversation.findUnique({
                    where: { id: convId }
                });

                if (!conversation || conversation.userId !== uId) {
                    return error(res, '对话不存在或无权访问', 404);
                }
            } else {
                // 创建新对话
                conversation = await prisma.chatConversation.create({
                    data: {
                        userId: uId,
                        babyId: babyContext ? (babyId ? BigInt(babyId) : undefined) : undefined,
                        title: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '')
                    }
                });
                convId = conversation.id;
            }

            // 保存用户消息
            await prisma.chatMessage.create({
                data: {
                    conversationId: convId,
                    role: 'user',
                    content: messageContent
                }
            });

            // 更新对话时间
            await prisma.chatConversation.update({
                where: { id: convId },
                data: { updatedAt: new Date() }
            });

            // 调用 AI
            const provider = AIFactory.createProvider();
            const prompt = buildPrompt(babyContext, messageContent);

            let aiResponse: string;
            try {
                const result = await provider.analyze({
                    babyProfile: babyContext ? {
                        name: babyContext.name,
                        gender: babyContext.gender === '男宝宝' ? 'male' : 'female',
                        birthDate: new Date(),
                        month: babyContext.month,
                        days: babyContext.days,
                        ageStr: babyContext.ageStr
                    } : undefined,
                    recentRecords: { feeding: [], sleep: [], growth: [] },
                    query: messageContent
                });
                aiResponse = result.insight || '抱歉，小溪暂时无法回答这个问题。';
            } catch (aiErr: any) {
                console.error('AI Error:', aiErr);
                aiResponse = `抱歉，AI 服务暂时繁忙: ${aiErr.message}。请稍后再试。`;
            }

            // 保存 AI 消息
            const aiMessage = await prisma.chatMessage.create({
                data: {
                    conversationId: convId,
                    role: 'assistant',
                    content: aiResponse,
                    model: 'MiniMax-M2.7'
                }
            });

            // 更新对话标题（如果是第一条用户消息）
            if (conversation.title.startsWith('新对话')) {
                await prisma.chatConversation.update({
                    where: { id: convId },
                    data: { title: messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '') }
                });
            }

            return success(res, {
                conversationId: convId.toString(),
                message: {
                    id: aiMessage.id.toString(),
                    role: 'assistant',
                    content: aiResponse,
                    createdAt: aiMessage.createdAt
                }
            });

        } catch (err: any) {
            console.error('Chat error:', err);
            return error(res, '发送消息失败: ' + err.message, 500);
        }
    }

    // DELETE - 删除对话
    if (req.method === 'DELETE') {
        const { conversationId } = req.query;

        if (!conversationId) {
            return error(res, '对话ID不能为空', 400);
        }

        try {
            const convId = BigInt(conversationId as string);
            const conv = await prisma.chatConversation.findUnique({
                where: { id: convId }
            });

            if (!conv) {
                return error(res, '对话不存在', 404);
            }

            if (conv.userId !== uId) {
                return error(res, '无权删除', 403);
            }

            // 级联删除会删除所有消息
            await prisma.chatConversation.delete({
                where: { id: convId }
            });

            return success(res, { message: '对话已删除' });
        } catch (err: any) {
            console.error('Delete conversation error:', err);
            return error(res, '删除失败: ' + err.message, 500);
        }
    }

    // PATCH - 更新对话（如置顶）
    if (req.method === 'PATCH') {
        const { conversationId, isPinned, title } = req.body;

        if (!conversationId) {
            return error(res, '对话ID不能为空', 400);
        }

        try {
            const convId = BigInt(conversationId);
            const conv = await prisma.chatConversation.findUnique({
                where: { id: convId }
            });

            if (!conv || conv.userId !== uId) {
                return error(res, '对话不存在或无权访问', 404);
            }

            const updated = await prisma.chatConversation.update({
                where: { id: convId },
                data: {
                    ...(isPinned !== undefined && { isPinned }),
                    ...(title && { title })
                }
            });

            return success(res, {
                id: updated.id.toString(),
                isPinned: updated.isPinned,
                title: updated.title
            });
        } catch (err: any) {
            console.error('Update conversation error:', err);
            return error(res, '更新失败: ' + err.message, 500);
        }
    }

    return error(res, 'Method Not Allowed', 405);
}

export const config = {
    maxDuration: 60,
};
