import { AIProvider, AIAnalysisRequest, AIAnalysisResponse } from '../types';
import { OpenAIProvider } from './openai';

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

        const babyAgeStr = babyProfile?.ageStr || babyProfile?.days
            ? `，宝宝${babyProfile.ageStr || `${babyProfile.days}天`}了`
            : '';

        const babyGender = babyProfile?.gender === 'male' ? '男宝宝' : '女宝宝';

        const isVaccineRelated = query && (
            query.includes('疫苗') ||
            query.includes('接种') ||
            query.includes('免疫')
        );

        let systemPrompt: string;
        let requireJson = false;

        if (isVaccineRelated) {
            requireJson = false;
            systemPrompt = `# 角色
你是一位专业的儿科医生和疫苗接种专家，专注于婴幼儿健康指导。

# 宝宝信息
${babyProfile ? `宝宝名字：${babyProfile.name}，${babyGender}${babyAgeStr}` : '暂无宝宝信息'}

# 最近7天记录
- 喂养记录：${JSON.stringify(recentRecords.feeding || [], null, 2)}
- 睡眠记录：${JSON.stringify(recentRecords.sleep || [], null, 2)}
- 用药记录：${JSON.stringify((recentRecords as any).medication || [], null, 2)}
- 健康记录：${JSON.stringify((recentRecords as any).health || [], null, 2)}

# 用户问题
${(query || '请分析宝宝现状并提供建议').trim()}

# 输出要求
直接返回**中文 Markdown 格式**的详细回答，不要返回 JSON。格式要求：
1. 使用 ## 标题格式
2. 使用 - 或 * 列表项
3. 适当使用 **加粗** 强调重点
4. 不要返回任何 JSON 或代码块包裹
5. 内容要专业、详细、有针对性`;
        } else {
            requireJson = false;
            systemPrompt = `# 角色
你是一位资深儿科医生，专注于婴幼儿健康成长指导。

# 宝宝信息
${babyProfile ? `宝宝名字：${babyProfile.name}，${babyGender}${babyAgeStr}` : '暂无宝宝信息'}

# 最近7天记录摘要
- 喂养：${this.summarizeFeeding(recentRecords.feeding || [])}
- 睡眠：${this.summarizeSleep(recentRecords.sleep || [])}
- 用药：${this.summarizeMedication((recentRecords as any).medication || [])}
- 健康：${this.summarizeHealth((recentRecords as any).health || [])}

# 用户问题
${(query || '请分析宝宝现状并提供建议').trim()}

# 输出要求
直接返回**专业、详细的中文 Markdown 格式**回答，包括：
1. **现状评估**：对宝宝喂养、睡眠、发育、健康的综合评估
2. **建议与对策**：5-7条针对性强的育儿建议
3. **温馨提示**：补充说明或注意事项

格式要求：
- 使用 ## 标题
- 使用 - 或 * 列表项
- 适当使用 **加粗** 强调
- 不要返回 JSON，不要用代码块包裹
- 内容必须全部是中文`;
        }

        try {
            const anthropicBaseUrl = this.baseUrl || process.env.ANTHROPIC_BASE_URL || process.env.AI_BASE_URL;
            // 只有当 baseUrl 包含 anthropic 且模型是 Claude 时才走 Anthropic 路径
            // 避免 MiniMax key + Anthropic endpoint 的错误组合
            const isAnthropic = anthropicBaseUrl?.includes('anthropic') && this.model.toLowerCase().includes('claude');

            console.log(`[MinimaxProvider] Request: isAnthropic=${isAnthropic}, baseUrl=${anthropicBaseUrl}, model=${this.model}`);

            if (isAnthropic) {
                const url = anthropicBaseUrl?.endsWith('/messages') ? anthropicBaseUrl : `${anthropicBaseUrl?.replace(/\/$/, '')}/v1/messages`;
                const body: any = {
                    model: this.model,
                    max_tokens: 2048,
                    messages: [
                        { role: 'user', content: systemPrompt }
                    ]
                };
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(60000)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`MiniMax Anthropic API Error (${response.status}): ${errorText}`);
                }

                const data = await response.json() as any;
                const content = data.content?.[0]?.text;

                return {
                    insight: content || '分析完成',
                    recommendations: [],
                    sentiment: 'neutral'
                };
            }

            const url = this.groupId
                ? `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${this.groupId}`
                : 'https://api.minimax.chat/v1/text/chatcompletion_v2';

            const body = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一位专业、经验丰富的儿科医生，始终用中文回答，用 Markdown 格式输出。'
                    },
                    {
                        role: 'user',
                        content: systemPrompt
                    }
                ],
                stream: false
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(60000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`MiniMax API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json() as any;
            const content = data.choices?.[0]?.message?.content;

            if (!content) throw new Error('Empty AI response');

            return {
                insight: content,
                recommendations: [],
                sentiment: 'neutral'
            };

        } catch (error: any) {
            console.error('AI Analysis Error (Handled):', error.message);

            // 如果是超时或 MiniMax 认证失败，尝试 OpenAI 作为 Fallback
            const isAuthError = error.message.includes('login fail') || 
                                error.message.includes('Unauthorized') ||
                                error.message.includes('401');
            
            if (isAuthError || error.name === 'TimeoutError' || error.message.includes('timeout')) {
                // 尝试用 OpenAI 作为 Fallback
                const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
                if (openaiKey) {
                    console.log('MiniMax failed, trying OpenAI as fallback...');
                    try {
                        const openaiProvider = new OpenAIProvider(openaiKey, 'gpt-4o-mini', this.baseUrl);
                        return await openaiProvider.analyze(request);
                    } catch (fallbackError: any) {
                        console.error('OpenAI Fallback also failed:', fallbackError.message);
                    }
                }
            }

            if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
                return {
                    insight: isVaccineRelated
                        ? "抱歉，AI 服务暂时繁忙，请稍后再试。\n\n## 疫苗接种提示\n- 请参考《国家免疫规划疫苗儿童免疫程序及说明》\n- 如有疑问可咨询当地疾控中心"
                        : "## 分析暂时不可用\n\nAI 医生正在忙碌中（请求超时），已为您准备初步建议。\n\n**近期照护建议：**\n- 保持室内空气流通\n- 定时监测宝宝体温\n- 记录喂养和睡眠情况\n- 点击「重新分析」再次尝试",
                    recommendations: isVaccineRelated ? [] : ["保持室内空气流通", "定时监测宝宝体温", "记录数据以便后续分析"],
                    sentiment: "neutral"
                };
            }

            return {
                insight: isVaccineRelated
                    ? "## 抱歉，AI 服务暂时不可用\n\n请稍后再试，或咨询当地医疗机构获取疫苗接种信息。"
                    : "## 分析服务暂时不可用\n\n请稍后再试。建议根据宝宝实际情况进行常规护理。\n\n**如有问题，请咨询专业儿科医生。**",
                recommendations: isVaccineRelated ? [] : ["如有异常请咨询专业医生", "记录数据以便后续分析"],
                sentiment: "neutral"
            };
        }
    }

    private summarizeFeeding(records: any[]): string {
        if (!records || records.length === 0) return '暂无喂养记录';
        const bottle = records.filter((r: any) => r.feedingType === 'bottle' || r.amount);
        const breast = records.filter((r: any) => r.feedingType === 'breast');
        const totalMl = bottle.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        return `共${records.length}次喂养，瓶喂${bottle.length}次（合计${totalMl}ml），亲喂${breast.length}次`;
    }

    private summarizeSleep(records: any[]): string {
        if (!records || records.length === 0) return '暂无睡眠记录';
        const totalMin = records.reduce((sum: number, r: any) => sum + (r.duration || 0), 0);
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;
        return `共${records.length}次睡眠，总时长约${hours}小时${mins}分钟`;
    }

    private summarizeMedication(records: any[]): string {
        if (!records || records.length === 0) return '暂无用药记录';
        const names = records.map((r: any) => r.name).filter(Boolean);
        return names.length > 0 ? names.join('、') : '有用药记录';
    }

    private summarizeHealth(records: any[]): string {
        if (!records || records.length === 0) return '暂无健康记录';
        const temps = records.filter((r: any) => r.type === 'TEMP' && r.value);
        const temp = temps.length > 0 ? `，最新体温${temps[0].value}°C` : '';
        return `共${records.length}条健康记录${temp}`;
    }
}
