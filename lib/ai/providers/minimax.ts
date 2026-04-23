import { AIProvider, AIAnalysisRequest, AIAnalysisResponse } from '../types';

export class MinimaxProvider implements AIProvider {
    private apiKey: string;
    private groupId: string;
    private model: string;
    private baseUrl?: string;

    constructor(apiKey: string, groupId: string = '', model: string = 'MiniMax-M2.7', baseUrl?: string) {
        this.apiKey = apiKey;
        this.groupId = groupId;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
        const { babyProfile, recentRecords, query } = request;

        const babyInfo = babyProfile ? `
宝宝档案：
名字：${babyProfile.name}
性别：${babyProfile.gender === 'male' ? '男' : '女'}
月龄：${babyProfile.month || '未知'}个月
` : '宝宝档案：目前暂无具体宝宝信息，请提供通用的育儿建议。';

        const isVaccineRelated = query && (
            query.includes('疫苗') ||
            query.includes('接种') ||
            query.includes('免疫')
        );

        let systemPrompt: string;
        let requireJson = true;

        if (isVaccineRelated) {
            requireJson = false;
            systemPrompt = `${babyInfo}
请根据以下信息，提供专业的疫苗接种指导：
最近记录：喂养${JSON.stringify(recentRecords.feeding)}, 睡眠${JSON.stringify(recentRecords.sleep)}, 用药${JSON.stringify((recentRecords as any).medication || [])}, 健康记录${JSON.stringify((recentRecords as any).health || [])}
用户提问：${(query || '').trim()}

请直接返回 Markdown 格式的详细回答，包括：
1. 当前月龄适合接种的疫苗清单
2. 每种疫苗的接种时间、预防疾病、注意事项
3. 接种前后的护理建议

使用清晰的 Markdown 格式（标题、列表、表格等）来组织内容。`;
        } else {
            requireJson = true;
            systemPrompt = `你是一位专业的育儿专家。请分析以下数据并以 JSON 返回：
1. insight: 总体评价
2. recommendations: 3-5条具体建议
3. sentiment: positive/neutral/concern

${babyInfo}
最近记录：喂养${JSON.stringify(recentRecords.feeding)}, 睡眠${JSON.stringify(recentRecords.sleep)}, 用药${JSON.stringify((recentRecords as any).medication || [])}, 健康记录${JSON.stringify((recentRecords as any).health || [])}
用户提问：${(query || '分析现状').trim()}`;
        }

        try {
            // 支持 MiniMax 的 Anthropic 兼容接口
            const anthropicBaseUrl = this.baseUrl || process.env.ANTHROPIC_BASE_URL || process.env.AI_BASE_URL;
            const isAnthropic = anthropicBaseUrl?.includes('anthropic') || this.model.toLowerCase().includes('claude');

            if (isAnthropic) {
                const url = anthropicBaseUrl?.endsWith('/messages') ? anthropicBaseUrl : `${anthropicBaseUrl?.replace(/\/$/, '')}/v1/messages`;
                const body: any = {
                    model: this.model,
                    max_tokens: 1024,
                    messages: [
                        { role: 'user', content: systemPrompt }
                    ]
                };
                if (requireJson) {
                    body.system = '你是一个专业的育儿助手，始终以简洁的 JSON 格式输出分析结果。';
                }
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(25000)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`MiniMax Anthropic API Error (${response.status}): ${errorText}`);
                }

                const data = await response.json() as any;
                const content = data.content?.[0]?.text;
                if (requireJson) {
                    return this.parseContent(content);
                } else {
                    return {
                        insight: content || '分析完成',
                        recommendations: [],
                        sentiment: 'neutral'
                    };
                }
            }

            // 使用标准 MiniMax V2 接口
            const url = this.groupId
                ? `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${this.groupId}`
                : 'https://api.minimax.chat/v1/text/chatcompletion_v2';

            const body: any = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: requireJson ? '你是一个专业的育儿助手，始终以 JSON 格式输出分析结果。' : '你是一位专业的儿科医生和疫苗专家，专注于婴幼儿疫苗接种指导。直接返回 Markdown 格式，不要 JSON。'
                    },
                    {
                        role: 'user',
                        content: systemPrompt
                    }
                ],
                stream: false
            };
            if (requireJson) {
                body.response_format = { type: 'json_object' };
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(25000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`MiniMax API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json() as any;
            const content = data.choices?.[0]?.message?.content;

            if (!content) throw new Error('Empty AI response');

            if (requireJson) {
                return this.parseContent(content);
            } else {
                return {
                    insight: content,
                    recommendations: [],
                    sentiment: 'neutral'
                };
            }

        } catch (error: any) {
            console.error('AI Analysis Error (Handled):', error);

            // 如果是超时或其他错误，返回降级后的默认建议，避免 500
            if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
                return {
                    insight: isVaccineRelated
                        ? "抱歉，AI 服务暂时繁忙，请稍后再试。疫苗接种相关信息可参考《国家免疫规划疫苗儿童免疫程序及说明》。"
                        : "AI 医生正在忙碌中（请求超时），已为您生成初步建议。近期请注意宝宝的作息规律和环境卫生。",
                    recommendations: isVaccineRelated
                        ? []
                        : ["保持室内空气流通", "定时监测宝宝体温", "点击'重新分析'再次尝试"],
                    sentiment: "neutral"
                };
            }

            // 其他错误也进行兜底
            return {
                insight: isVaccineRelated
                    ? "抱歉，AI 服务暂时不可用，请稍后再试。疫苗接种相关信息可参考《国家免疫规划疫苗儿童免疫程序及说明》。"
                    : "分析服务暂时不可用，请稍后再试。建议根据宝宝实际情况进行常规护理。",
                recommendations: isVaccineRelated
                    ? []
                    : ["如有异常请咨询专业医生", "记录数据以便后续分析"],
                sentiment: "neutral"
            };
        }
    }

    private parseContent(content: string): AIAnalysisResponse {
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (e) {
            // 如果不是 JSON，尝试清洗
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
            } else {
                throw e;
            }
        }
        
        return {
            insight: parsed.insight || '分析完成',
            recommendations: parsed.recommendations || [],
            sentiment: parsed.sentiment || 'neutral'
        };
    }
}
