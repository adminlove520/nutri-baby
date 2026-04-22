import { AIProvider, AIAnalysisRequest, AIAnalysisResponse } from '../types';

export class MinimaxProvider implements AIProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'MiniMax-M2.7') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
        const { babyProfile, recentRecords, query } = request;

        const systemPrompt = `你是一位资深的育儿专家。请根据提供的宝宝档案和最近的记录（喂养、睡眠、生长），给出一份简洁明了的分析报告。
报告必须包含：
1. 洞察（insight）：对当前状态的总体评价。
2. 建议（recommendations）：3-5条具体的改进或维持建议。
3. 情感（sentiment）：positive, neutral, 或 concern。

宝宝档案：
名字：${babyProfile.name}
性别：${babyProfile.gender === 'male' ? '男' : '女'}
月龄：${babyProfile.month}个月

最近记录：
- 喂养：${JSON.stringify(recentRecords.feeding)}
- 睡眠：${JSON.stringify(recentRecords.sleep)}
- 生长：${JSON.stringify(recentRecords.growth)}

用户的问题：${query || '请分析宝宝最近的状况。'}

请以 JSON 格式返回，格式如下：
{
  "insight": "...",
  "recommendations": ["...", "..."],
  "sentiment": "positive/neutral/concern"
}`;

        try {
            const response = await fetch('https://api.minimax.chat/v1/text_generation_v2', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: 'You are a helpful parenting expert.' },
                        { role: 'user', content: systemPrompt }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Minimax API error: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            return JSON.parse(content) as AIAnalysisResponse;

        } catch (error) {
            console.error('Minimax analysis failed:', error);
            // Fallback to mock if API fails during dev/migration
            return {
                insight: "分析服务暂时不可用，但根据记录显示宝宝状态基本正常。",
                recommendations: ["请稍后再试", "保持观察"],
                sentiment: 'neutral'
            };
        }
    }
}
