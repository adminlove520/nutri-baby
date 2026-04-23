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

        const systemPrompt = `你是一位育儿专家。请分析以下数据并以 JSON 返回：
1. insight: 总体评价
2. recommendations: 3条具体建议
3. sentiment: positive/neutral/concern

${babyInfo}
最近记录：喂养${JSON.stringify(recentRecords.feeding)}, 睡眠${JSON.stringify(recentRecords.sleep)}, 用药${JSON.stringify((recentRecords as any).medication || [])}, 健康${JSON.stringify((recentRecords as any).health || [])}
用户提问：${query || '分析现状'}`;

        try {
            // 使用标准 Fetch API 调用 MiniMax V2 接口
            const url = this.groupId 
                ? `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${this.groupId}`
                : 'https://api.minimax.chat/v1/text/chatcompletion_v2';

            const response = await fetch(url, {
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
                    response_format: { type: 'json_object' },
                    stream: false
                }),
                // 设置 9 秒超时（Vercel Hobby 10秒限制），给程序留点时间报错
                signal: AbortSignal.timeout(9000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = errorText;
                }
                throw new Error(`MiniMax API Error (${response.status}): ${typeof errorData === 'object' ? JSON.stringify(errorData) : errorData}`);
            }

            const data = await response.json();
            
            // Check for choices and message structure
            if (!data || !data.choices || data.choices.length === 0 || !data.choices[0].message) {
                console.error('Unexpected MiniMax Response Structure:', data);
                throw new Error(`MiniMax API returned unexpected structure: ${JSON.stringify(data)}`);
            }
            
            const content = data.choices[0].message.content;
            if (content === undefined || content === null) {
                console.error('MiniMax API returned null/undefined content:', data);
                throw new Error('MiniMax API returned empty content');
            }

            // 尝试解析 JSON
            try {
                // 如果 content 已经是对象（虽然通常是字符串）
                if (typeof content === 'object') {
                    return {
                        insight: (content as any).insight || '无法获取分析洞察',
                        recommendations: (content as any).recommendations || [],
                        sentiment: (content as any).sentiment || 'neutral'
                    };
                }

                // 模型可能返回带 markdown 代码块的内容，先进行强力清洗
                let cleanedContent = content.trim();
                // 移除可能的开头结尾非 JSON 字符（比如 "这是分析结果：{...}"）
                const jsonStart = cleanedContent.indexOf('{');
                const jsonEnd = cleanedContent.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
                }
                
                const parsed = JSON.parse(cleanedContent);
                
                return {
                    insight: parsed.insight || '分析完成，但未返回具体洞察',
                    recommendations: parsed.recommendations || [],
                    sentiment: parsed.sentiment || 'neutral'
                };
            } catch (e) {
                console.error('JSON Parse Error from MiniMax. Raw content:', content);
                // 允许返回非 JSON 文本作为洞察，这样前端至少能看到东西
                return {
                    insight: typeof content === 'string' ? content : '分析数据格式异常',
                    recommendations: ["建议点击重新分析尝试获取更准确的结果"],
                    sentiment: 'neutral'
                };
            }
        } catch (error: any) {
            console.error('MiniMax Provider Error:', error);
            throw error;
        }
    }
}
