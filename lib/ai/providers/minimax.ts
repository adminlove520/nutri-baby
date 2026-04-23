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

        const systemPrompt = `你是一位专业的育儿专家。请分析以下数据并以 JSON 返回：
1. insight: 总体评价
2. recommendations: 3-5条具体建议
3. sentiment: positive/neutral/concern

${babyInfo}
最近记录：喂养${JSON.stringify(recentRecords.feeding)}, 睡眠${JSON.stringify(recentRecords.sleep)}, 用药${JSON.stringify((recentRecords as any).medication || [])}, 健康记录${JSON.stringify((recentRecords as any).health || [])}
用户提问：${(query || '分析现状').trim()}`;

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
                // 恢复为较长的超时时间
                signal: AbortSignal.timeout(25000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`MiniMax API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            
            if (!content) throw new Error('Empty AI response');

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

        } catch (error: any) {
            console.error('AI Analysis Error (Handled):', error);
            
            // 如果是超时或其他错误，返回降级后的默认建议，避免 500
            if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
                return {
                    insight: "AI 医生正在忙碌中（请求超时），已为您生成初步建议。近期请注意宝宝的作息规律和环境卫生。",
                    recommendations: ["保持室内空气流通", "定时监测宝宝体温", "点击'重新分析'再次尝试"],
                    sentiment: "neutral"
                };
            }
            
            // 其他错误也进行兜底
            return {
                insight: "分析服务暂时不可用，请稍后再试。建议根据宝宝实际情况进行常规护理。",
                recommendations: ["如有异常请咨询专业医生", "记录数据以便后续分析"],
                sentiment: "neutral"
            };
        }
    }
}
