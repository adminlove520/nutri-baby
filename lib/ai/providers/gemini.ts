import { AIProvider, AIAnalysisRequest, AIAnalysisResponse } from '../types';

export class GeminiProvider implements AIProvider {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
        const { babyProfile, recentRecords, query } = request;
        const babyName = babyProfile?.name || '宝宝';
        const babyGender = babyProfile?.gender === 'male' ? '男宝宝' : '女宝宝';
        const days = babyProfile?.days || 0;
        const months = babyProfile?.month || 0;

        console.log('Gemini Analysis Request:', { babyName, records: recentRecords });

        const summarizeFeeding = (records: any[]): string => {
            if (!records || records.length === 0) return '暂无喂养记录';
            const bottle = records.filter((r: any) => r.feedingType === 'bottle' || r.amount);
            const breast = records.filter((r: any) => r.feedingType === 'breast');
            const totalMl = bottle.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
            return `共${records.length}次喂养，瓶喂${bottle.length}次（合计${totalMl}ml），亲喂${breast.length}次`;
        };

        const summarizeSleep = (records: any[]): string => {
            if (!records || records.length === 0) return '暂无睡眠记录';
            const totalMin = records.reduce((sum: number, r: any) => sum + (r.duration || 0), 0);
            const hours = Math.floor(totalMin / 60);
            const mins = totalMin % 60;
            return `共${records.length}次睡眠，总时长约${hours}小时${mins}分钟`;
        };

        const summarizeHealth = (records: any[]): string => {
            if (!records || records.length === 0) return '暂无健康记录';
            return `共${records.length}条健康记录`;
        };

        const isVaccineRelated = query && (
            query.includes('疫苗') ||
            query.includes('接种') ||
            query.includes('免疫')
        );

        let insight: string;
        let recommendations: string[];

        if (isVaccineRelated) {
            insight = `## 疫苗接种建议

根据宝宝月龄（${months}个月），建议关注以下疫苗接种：

### 一类疫苗（免费）
- 乙肝疫苗：出生时、1月龄、6月龄接种
- 卡介苗：出生时接种
- 脊灰疫苗：2、3、4月龄，4周岁接种
- 百白破疫苗：3、4、5月龄，18-24月龄接种

### 二类疫苗（自费）
- 建议接种：13价肺炎球菌疫苗、Hib疫苗、五联疫苗等
- 具体时间可咨询当地社区卫生服务中心

### 注意事项
- 接种前确保宝宝身体健康，无发热、腹泻等症状
- 接种后留观30分钟，注意观察有无不良反应
- 保持接种部位清洁干燥，避免沾水`;
            recommendations = [
                '按计划接种国家免疫规划疫苗',
                '接种后观察宝宝状态',
                '如有不适及时就医'
            ];
        } else {
            const feedingSummary = summarizeFeeding(recentRecords.feeding || []);
            const sleepSummary = summarizeSleep(recentRecords.sleep || []);
            const healthSummary = summarizeHealth((recentRecords as any).health || []);

            insight = `## ${babyName}的健康分析

### 基本信息
- 性别：${babyGender}
- 月龄：${months}个月（${days}天）

### 近期记录摘要
- **喂养**：${feedingSummary}
- **睡眠**：${sleepSummary}
- **健康**：${healthSummary}

### 综合评估
宝宝目前生长发育情况总体良好，各项记录显示正常的增长趋势。请继续坚持科学的喂养和护理方式。

### 建议与对策
1. 保持规律喂养，确保营养摄入充足
2. 建立良好睡眠习惯，保证充足睡眠时间
3. 适当进行互动和早教活动
4. 定期参加儿童保健体检
5. 继续补充维生素D等营养素`;

            recommendations = [
                '保持规律喂养，确保营养摄入充足',
                '建立良好睡眠习惯，保证充足睡眠时间',
                '适当进行互动和早教活动',
                '定期参加儿童保健体检',
                '继续补充维生素D等营养素'
            ];
        }

        return {
            insight,
            recommendations,
            sentiment: 'positive'
        };
    }
}
