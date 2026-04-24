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

        if (isVaccineRelated) {
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
            const requestBody = {
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
                temperature: 0.7
            };

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(60000)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
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
            console.error('OpenAI Analysis Error:', error);

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
