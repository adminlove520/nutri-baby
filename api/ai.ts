import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';
import { success, error } from '../lib/utils';
import { sendAIAnalysisNotification } from '../lib/notification';

// 测试各 AI 服务延迟的工具函数
async function testAIDelay(provider: string, apiKey: string, baseUrl?: string): Promise<{ provider: string; latency: number; status: string }> {
    const start = Date.now();
    try {
        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return { provider, latency: Date.now() - start, status: res.status.toString() };
        } else if (provider === 'minimax') {
            const url = baseUrl || 'https://api.minimaxi.com/anthropic/v1/messages';
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'MiniMax-M2.7',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'hi' }]
                })
            });
            return { provider, latency: Date.now() - start, status: res.status.toString() };
        } else if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const res = await fetch(url);
            return { provider, latency: Date.now() - start, status: res.status.toString() };
        }
        return { provider, latency: -1, status: 'unknown provider' };
    } catch (e: any) {
        return { provider, latency: Date.now() - start, status: `error: ${e.message}` };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 延迟测试接口
    if (req.method === 'GET' && req.query.action === 'ping_ai') {
        const openaiKey = process.env.OPENAI_API_KEY || '';
        const minimaxKey = process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY || '';
        const minimaxUrl = process.env.ANTHROPIC_BASE_URL || '';

        const results = await Promise.all([
            openaiKey ? testAIDelay('openai', openaiKey) : Promise.resolve({ provider: 'openai', latency: -1, status: 'no key' }),
            minimaxKey ? testAIDelay('minimax', minimaxKey, minimaxUrl) : Promise.resolve({ provider: 'minimax', latency: -1, status: 'no key' }),
        ]);

        return res.status(200).json({ results, timestamp: new Date().toISOString() });
    }

    const user = await getUserFromRequest(req);
    if (!user) {
        return error(res, 'Unauthorized', 401);
    }

    if (req.method === 'GET' && req.query.action === 'tips') {
        const { babyId, forceAI } = req.query;

        try {
            let baby: any = null;
            let babyAgeMonth = -1;

            if (babyId && babyId !== 'null' && babyId !== 'undefined') {
                const bId = BigInt(babyId.toString());
                const hasPermission = await hasBabyPermission(user.userId, bId);

                if (hasPermission) {
                    baby = await prisma.baby.findUnique({ where: { id: bId } });
                    if (baby) {
                        babyAgeMonth = Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000));
                    }
                }
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

                    const babyAgeStr = baby
                        ? babyAgeMonth >= 1
                            ? `${babyAgeMonth}个月大的${baby.gender === 'male' ? '男宝宝' : '女宝宝'}（${baby.name}）`
                            : `${Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / (1000 * 60 * 60 * 24))}天大的宝宝（${baby.name}）`
                        : '';

                    let recentRecords = { feeding: [] as any[], sleep: [] as any[], growth: [] as any[] };
                    if (baby) {
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        const [feeding, sleep, growth] = await Promise.all([
                            prisma.feedingRecord.findMany({
                                where: { babyId: baby.id, time: { gte: sevenDaysAgo } },
                                orderBy: { time: 'desc' },
                                take: 10
                            }),
                            prisma.sleepRecord.findMany({
                                where: { babyId: baby.id, startTime: { gte: sevenDaysAgo } },
                                orderBy: { startTime: 'desc' },
                                take: 10
                            }),
                            prisma.growthRecord.findMany({
                                where: { babyId: baby.id, time: { gte: sevenDaysAgo } },
                                orderBy: { time: 'desc' },
                                take: 5
                            })
                        ]);
                        const serialize = (data: any) => JSON.parse(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v));
                        recentRecords = {
                            feeding: serialize(feeding),
                            sleep: serialize(sleep),
                            growth: serialize(growth)
                        };
                    }

                    const aiResponse = await ai.analyze({
                        babyProfile: baby ? {
                            name: baby.name,
                            birthDate: baby.birthDate,
                            gender: baby.gender,
                            month: babyAgeMonth,
                            days: Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / (1000 * 60 * 60 * 24)),
                            ageStr: babyAgeMonth >= 1 ? `${babyAgeMonth}个月` : `${Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / (1000 * 60 * 60 * 24))}天`
                        } : undefined,
                        recentRecords,
                        query: baby ? `请为${babyAgeStr}提供每日育儿建议。请用以下JSON格式返回：{"title": "建议标题（15字内）", "content": "建议的详细正文（用数字列表组织，100-200字，纯文本格式）", "category": "建议类别"}` : '请为新生儿到3岁阶段的宝宝家长提供育儿建议。请用JSON格式返回：{"title": "建议标题（15字内）", "content": "建议的详细正文（100-200字，纯文本格式）", "category": "建议类别"}'
                    });

                    const content = aiResponse.insight;

                    // 检查是否返回了JSON格式（尝试多种匹配方式）
                    let jsonData: any = null;
                    
                    // 方式1：直接解析（如果是纯JSON）
                    try {
                        jsonData = JSON.parse(content.trim());
                    } catch {}
                    
                    // 方式2：提取JSON对象（可能在文本中间）
                    if (!jsonData) {
                        const jsonMatch = content.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                jsonData = JSON.parse(jsonMatch[0]);
                            } catch {}
                        }
                    }
                    
                    if (jsonData && jsonData.title && (jsonData.content || jsonData.description)) {
                        tips = [{
                            title: jsonData.title,
                            content: jsonData.content || jsonData.description,
                            category: jsonData.category || 'general'
                        }];
                    }
                    // 如果JSON格式是数组，尝试解析
                    else if (jsonData && Array.isArray(jsonData) && jsonData.length > 0) {
                        tips = jsonData.slice(0, 3).map((item: any) => ({
                            title: item.title || item.name || '育儿建议',
                            content: item.content || item.description || item.text || JSON.stringify(item),
                            category: item.category || 'general'
                        })).filter((t: any) => t.content);
                    }

                    // 如果还没解析出tips，尝试Markdown格式解析
                    if (tips.length === 0) {
                        // 按段落分割内容（支持多种分隔符）
                        const paragraphs = content.split(/\n{2,}|\n(?=#{1,6}\s)|(?<=^|\n)(?=#{1,6}\s)/).filter(p => p.trim().length > 0);
                        
                        if (paragraphs.length > 0) {
                            tips = paragraphs.slice(0, 3).map((para, idx) => {
                                const lines = para.trim().split(/\n/);
                                let title = lines[0]?.replace(/^#{1,6}\s+|^[-*•\d]+\s*/g, '').trim() || '';
                                
                                // 如果第一行太短（看起来像标题），尝试合并下一行
                                if (title.length < 10 && lines.length > 1) {
                                    title = lines.slice(0, 2).join(' ').replace(/^#{1,6}\s+/g, '').trim();
                                }
                                
                                // content 是除了第一行之外的所有内容
                                let bodyLines = lines.slice(1);
                                // 如果 body 为空，尝试用整个段落（去掉标题部分）
                                let content = bodyLines.length > 0 ? bodyLines.join('\n').trim() : para.replace(/^#{1,6}\s+/g, '').trim();
                                
                                // 如果 content 太短（和 title 一样或空），使用原始段落
                                if (content.length < title.length) {
                                    content = para.replace(/^#{1,6}\s*/, '').trim();
                                }
                                
                                return {
                                    title: title.substring(0, 40) || `育儿建议${idx + 1}`,
                                    content: content,
                                    category: 'general'
                                };
                            });
                        }
                    }

                    // 最终fallback：如果还是没解析出来
                    if (tips.length === 0) {
                        // 简单按行分割，每行作为一条
                        const lines = content.split(/\n/).filter(l => l.trim().length > 10);
                        tips = lines.slice(0, 3).map((line, idx) => {
                            const cleanLine = line.replace(/^#{1,6}\s+|^[-*•\d]+\s*/g, '').trim();
                            return {
                                title: cleanLine.substring(0, 40) || `建议${idx + 1}`,
                                content: cleanLine,
                                category: 'general'
                            };
                        });
                    }

                    if (tips.length === 0) {
                        tips = [{
                            title: '育儿建议',
                            content: content.substring(0, 200),
                            category: 'general'
                        }];
                    }
                } catch (aiErr) {
                    console.error('AI Tips Error:', aiErr);
                    tips = [{
                        title: '欢迎开启育儿之旅',
                        content: '请先在"宝宝设置"中添加宝宝信息，获取更精准的每日建议。',
                        category: 'general'
                    }];
                }
            }

            const safeTips = tips.map((t: any, idx) => ({
                id: t.id?.toString() || `ai-${idx}`,
                title: t.title,
                description: t.content || t.description,
                type: t.category,
                priority: baby ? 'high' : 'medium'
            }));

            // 手动触发时，存储到 ExpertTip 并创建通知
            // 注意：只在 forceAI=true 时才执行存储，避免增加响应时间
            if (forceAI === 'true' && safeTips.length > 0) {
                // 异步存储，不阻塞响应
                const tip = safeTips[0];
                const userId = BigInt(user.userId);
                const babyIdBigInt = baby ? BigInt(baby.id) : null;
                
                // 使用 setImmediate 异步执行存储，不阻塞主流程
                setImmediate(async () => {
                    try {
                        await prisma.expertTip.create({
                            data: {
                                title: tip.title,
                                content: tip.description,
                                category: tip.type || '每日推荐',
                                minAgeMonth: 0,
                                maxAgeMonth: 36,
                                source: 'AI Daily (Manual)',
                                createdBy: userId
                            }
                        });
                        
                        // 使用统一通知模块发送站内信+邮件
                        await sendDailyTipNotification(userId, tip.title, tip.description, tip.type);
                        
                        // 如果有 babyId，也创建 AIAnalysis 记录
                        if (babyIdBigInt) {
                            await prisma.aIAnalysis.create({
                                data: {
                                    userId,
                                    babyId: babyIdBigInt,
                                    type: 'tips',
                                    query: '每日锦囊',
                                    response: tip.description || '每日锦囊生成完成',
                                    sentiment: 'positive'
                                }
                            });
                        }
                    } catch (storeErr) {
                        console.error('Failed to store tips:', storeErr);
                    }
                });
            }

            return res.status(200).json(safeTips);
        } catch (error: any) {
            console.error('Tips API Error:', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }

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

        // 存储 AI 分析结果到数据库
        try {
            const babyIdBigInt = babyIdStr ? BigInt(babyIdStr) : null;
            const responseContent = normalized.insight || 'AI 分析完成';
            
            const analysis = await prisma.aIAnalysis.create({
                data: {
                    userId: BigInt(user.userId),
                    babyId: babyIdBigInt,
                    type: 'health',
                    query: query || '',
                    response: responseContent,
                    sentiment: normalized.sentiment || 'neutral'
                }
            });

            // 创建站内通知 + 邮件推送
            const babyName = babyProfile?.name ? `（${babyProfile.name}）` : '';
            await sendAIAnalysisNotification(
                BigInt(user.userId),
                `AI 健康分析${babyName}`,
                normalized.insight.substring(0, 500) + (normalized.insight.length > 500 ? '...' : ''),
                babyProfile?.name
            );

            return success(res, {
                id: analysis.id.toString(),
                ...normalized
            });
        } catch (storeErr) {
            // 存储失败不影响返回
            console.error('Failed to store AI analysis:', storeErr);
            return success(res, normalized);
        }

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
