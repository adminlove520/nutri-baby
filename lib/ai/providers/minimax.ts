import { AIProvider, AIAnalysisRequest, AIAnalysisResponse } from '../types';

export class MinimaxProvider implements AIProvider {
    private apiKey: string;
    private groupId: string;
    private model: string;

    constructor(apiKey: string, groupId: string = '', model: string = 'MiniMax-M2.7') {
        this.apiKey = apiKey;
        this.groupId = groupId;
        this.model = model;
    }

    async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
        const { babyProfile, recentRecords, query } = request;

        const babyInfo = babyProfile ? `
宝宝档案：
名字：${babyProfile.name}
性别：${babyProfile.gender === 'male' ? '男' : '女'}
月龄：${babyProfile.month || '未知'}个月
` : '宝宝档案：目前暂无具体宝宝信息，请提供通用的育儿建议。';

        const systemPrompt = `你是一位资深的育儿专家。请根据提供的宝宝档案和最近的记录（喂养、睡眠、生长），给出一份简洁明了的分析报告。
报告必须包含：
1. 洞察（insight）：对当前状态的总体评价。
2. 建议（recommendations）：3-5条具体的改进或维持建议。
3. 情感（sentiment）：positive, neutral, 或 concern。

${babyInfo}

最近记录：
- 喂养：${JSON.stringify(recentRecords.feeding)}
- 睡眠：${JSON.stringify(recentRecords.sleep)}
- 生长：${JSON.stringify(recentRecords.growth)}

用户的问题：${query || '请分析宝宝最近的状况。'}

请以符合要求的 JSON 格式返回，不要包含任何 markdown 代码块标识。
{
  "insight": "...",
  "recommendations": ["...", "..."],
  "sentiment": "positive/neutral/concern"
}`;

        try {
            // 使用标准 Fetch API 调用 MiniMax V2 接口
            const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
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
                            content: '你是一个专业的育儿助手，始终以 JSON 格式输出分析结果。'
                        },
                        {
                            role: 'user',
                            content: systemPrompt
                        }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`MiniMax API Error: ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            // 尝试解析 JSON
            try {
                // 有些模型即便要求 json_object 也会返回带 ```json 的内容，做一次清洗
                const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
                const parsed = JSON.parse(cleanedContent);
                
                return {
                    insight: parsed.insight || '无法获取分析结果',
                    recommendations: parsed.recommendations || [],
                    sentiment: parsed.sentiment || 'neutral'
                };
            } catch (e) {
                console.error('JSON Parse Error from MiniMax:', content);
                return {
                    insight: content, // 回退：直接显示文本内容
                    recommendations: ["建议咨询医生获取详细指导"],
                    sentiment: 'neutral'
                };
            }
        } catch (error: any) {
            console.error('MiniMax Provider Error:', error);
            throw error;
        }
    }
}
