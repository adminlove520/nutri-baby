import { AIProvider, AIAnalysisRequest, AIAnalysisResponse } from '../types';

export class OpenAIProvider implements AIProvider {
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    constructor(apiKey: string, model: string = 'gpt-4o-mini', baseUrl?: string) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl || 'https://api.openai.com/v1';
    }

    async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
        const { babyProfile, recentRecords, query } = request;

        const babyInfo = babyProfile
            ? `宝宝: ${babyProfile.name}, 性别: ${babyProfile.gender}, 月龄: ${babyProfile.month}个月`
            : '（未选择宝宝）';

        const isVaccineRelated = query && (
            query.includes('疫苗') ||
            query.includes('接种') ||
            query.includes('免疫')
        );

        let systemPrompt: string;
        let userPrompt: string;
        let requireJson = true;

        if (isVaccineRelated) {
            requireJson = false;
            systemPrompt = `你是一位专业的儿科医生和疫苗专家，专注于婴幼儿疫苗接种指导。`;
            userPrompt = `${babyInfo}
请根据以下信息，提供专业的疫苗接种指导：
最近记录：喂养${JSON.stringify(recentRecords.feeding)}, 睡眠${JSON.stringify(recentRecords.sleep)}, 医疗${JSON.stringify((recentRecords as any).medication || [])}, 健康记录${JSON.stringify((recentRecords as any).health || [])}
用户提问：${query.trim()}

请直接返回 Markdown 格式的详细回答，包括：
1. 当前月龄适合接种的疫苗清单
2. 每种疫苗的接种时间、预防疾病、注意事项
3. 接种前后的护理建议

使用清晰的 Markdown 格式（标题、列表、表格等）来组织内容。`;
        } else {
            requireJson = true;
            systemPrompt = `你是一位专业的育儿专家。请根据以下宝宝的最近数据提供深度的健康分析，并以 JSON 格式返回结果。
1. insight: 对宝宝现状的总体评价与洞察
2. recommendations: 3-5条针对性的专业育儿建议
3. sentiment: 情绪倾向 (positive/neutral/concern)`;
            userPrompt = `${babyInfo}
最近记录：喂养${JSON.stringify(recentRecords.feeding)}, 睡眠${JSON.stringify(recentRecords.sleep)}, 医疗${JSON.stringify((recentRecords as any).medication || [])}, 健康记录${JSON.stringify((recentRecords as any).health || [])}
用户提问：${(query || '请分析宝宝现状并提供建议').trim()}`;
        }

        try {
            const requestBody: any = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.7
            };

            if (requireJson) {
                requestBody.response_format = { type: 'json_object' };
            }

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(25000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json() as any;
            const content = data.choices?.[0]?.message?.content;

            if (!content) throw new Error('Empty AI response');

            if (requireJson) {
                let parsed;
                try {
                    parsed = JSON.parse(content);
                } catch (e) {
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
            } else {
                return {
                    insight: content,
                    recommendations: [],
                    sentiment: 'neutral'
                };
            }

        } catch (error: any) {
            console.error('OpenAI Analysis Error:', error);

            return {
                insight: isVaccineRelated
                    ? "抱歉，AI 服务暂时繁忙，请稍后再试。疫苗接种相关信息可参考《国家免疫规划疫苗儿童免疫程序及说明》。"
                    : "AI 服务暂时超时或繁忙，请稍后再试。建议关注宝宝饮食平衡与睡眠充足。",
                recommendations: isVaccineRelated
                    ? []
                    : ["保持良好的卫生习惯", "定期接种疫苗", "观察宝宝精神状态"],
                sentiment: "neutral"
            };
        }
    }
}
