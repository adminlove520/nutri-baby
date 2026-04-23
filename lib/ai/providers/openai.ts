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

        const systemPrompt = `你是一位专业的育儿专家。请根据以下宝宝的最近数据提供深度的健康分析，并以 JSON 格式返回结果。
1. insight: 对宝宝现状的总体评价与洞察
2. recommendations: 3-5条针对性的专业育儿建议
3. sentiment: 情绪倾向 (positive/neutral/concern)

${babyInfo}
最近记录：喂养${JSON.stringify(recentRecords.feeding)}, 睡眠${JSON.stringify(recentRecords.sleep)}, 医疗${JSON.stringify((recentRecords as any).medication || [])}, 健康记录${JSON.stringify((recentRecords as any).health || [])}
用户提问：${(query || '请分析宝宝现状并提供建议').trim()}`;

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个专业的育儿助手，始终以 JSON 格式输出深度分析结果。'
                        },
                        {
                            role: 'user',
                            content: systemPrompt
                        }
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.7
                }),
                // 增加超时容忍度。对于 OpenAI 来说，15-25s 通常很稳
                signal: AbortSignal.timeout(25000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            
            if (!content) throw new Error('Empty AI response');

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

        } catch (error: any) {
            console.error('OpenAI Analysis Error:', error);
            
            return {
                insight: "AI 服务暂时超时或繁忙，请稍后再试。建议关注宝宝饮食平衡与睡眠充足。",
                recommendations: ["保持良好的卫生习惯", "定期接种疫苗", "观察宝宝精神状态"],
                sentiment: "neutral"
            };
        }
    }
}
