/**
 * 宝宝发育评估 Skill
 * 
 * 处理：生长发育评估、骨龄、身高体重、早产儿矫正等
 */

import { Skill, SkillContext, SkillResponse } from './index';

// 发育相关关键词
const GROWTH_KEYWORDS = [
    '发育', '生长', '身高', '体重', '长高', '长胖', '增高',
    '生长发育', '发育评估', '骨龄', '早产儿', '纠正月龄',
    '达标', '偏瘦', '偏胖', '矮小', '超重', '肥胖',
    '体重低下', '发育迟缓', '低体重', '超身高'
];

// WHO 0-2岁男童体重标准 (kg)
const WHO_BOY_WEIGHT = {
    0: [2.5, 3.4, 4.5, 5.6, 6.3, 6.9, 7.4, 7.8, 8.2, 8.5],
    3: [8.8, 9.0, 9.2, 9.4, 9.6, 9.8, 10.0, 10.2, 10.4, 10.6],
    6: [10.8, 10.9, 11.1, 11.2, 11.4, 11.5, 11.7, 11.8, 12.0, 12.1],
    9: [12.3, 12.4, 12.5, 12.7, 12.8, 12.9, 13.1, 13.2, 13.4, 13.5],
    12: [13.7, 13.8, 13.9, 14.0, 14.2, 14.3, 14.4, 14.6, 14.7, 14.8],
    15: [15.0, 15.1, 15.2, 15.4, 15.5, 15.6, 15.7, 15.9, 16.0, 16.1],
    18: [16.3, 16.4, 16.5, 16.6, 16.8, 16.9, 17.0, 17.2, 17.3, 17.4],
    21: [17.6, 17.7, 17.8, 17.9, 18.1, 18.2, 18.3, 18.5, 18.6, 18.7],
    24: [18.9, 19.0, 19.1, 19.2, 19.3, 19.5, 19.6, 19.7, 19.8, 20.0]
};

// WHO 0-2岁男童身高标准 (cm)
const WHO_BOY_HEIGHT = {
    0: [46.1, 48.0, 50.0, 52.0, 53.5, 55.0, 56.5, 57.8, 59.0, 60.0],
    3: [60.9, 61.7, 62.5, 63.3, 64.0, 64.8, 65.5, 66.2, 66.9, 67.5],
    6: [68.2, 68.8, 69.4, 70.0, 70.6, 71.2, 71.8, 72.4, 73.0, 73.6],
    9: [74.2, 74.8, 75.4, 76.0, 76.6, 77.2, 77.8, 78.5, 79.1, 79.8],
    12: [80.5, 81.1, 81.8, 82.5, 83.1, 83.8, 84.5, 85.2, 85.9, 86.6],
    15: [87.3, 88.0, 88.7, 89.4, 90.1, 90.9, 91.6, 92.3, 93.0, 93.8],
    18: [94.5, 95.2, 95.9, 96.6, 97.4, 98.1, 98.8, 99.5, 100.3, 101.0],
    21: [101.7, 102.4, 103.1, 103.8, 104.5, 105.2, 105.9, 106.6, 107.3, 108.0],
    24: [108.7, 109.4, 110.1, 110.8, 111.5, 112.2, 112.9, 113.6, 114.3, 115.0]
};

// WHO 0-2岁女童体重标准 (kg)
const WHO_GIRL_WEIGHT = {
    0: [2.4, 3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.4, 7.8, 8.2],
    3: [8.5, 8.8, 9.0, 9.2, 9.4, 9.6, 9.8, 10.0, 10.2, 10.4],
    6: [10.6, 10.8, 10.9, 11.1, 11.2, 11.4, 11.5, 11.7, 11.8, 12.0],
    9: [12.2, 12.3, 12.5, 12.6, 12.8, 12.9, 13.1, 13.2, 13.4, 13.5],
    12: [13.7, 13.8, 13.9, 14.0, 14.2, 14.3, 14.4, 14.6, 14.7, 14.8],
    15: [15.0, 15.1, 15.2, 15.4, 15.5, 15.6, 15.7, 15.9, 16.0, 16.1],
    18: [16.3, 16.4, 16.5, 16.6, 16.8, 16.9, 17.0, 17.2, 17.3, 17.4],
    21: [17.6, 17.7, 17.8, 17.9, 18.1, 18.2, 18.3, 18.5, 18.6, 18.7],
    24: [18.9, 19.0, 19.1, 19.2, 19.3, 19.5, 19.6, 19.7, 19.8, 20.0]
};

// WHO 0-2岁女童身高标准 (cm)
const WHO_GIRL_HEIGHT = {
    0: [45.4, 47.3, 49.0, 51.0, 52.5, 54.0, 55.5, 56.8, 58.0, 59.0],
    3: [60.0, 60.8, 61.5, 62.3, 63.0, 63.8, 64.5, 65.2, 65.9, 66.5],
    6: [67.2, 67.8, 68.4, 69.0, 69.6, 70.2, 70.8, 71.4, 72.0, 72.6],
    9: [73.2, 73.8, 74.4, 75.0, 75.6, 76.2, 76.8, 77.5, 78.1, 78.8],
    12: [79.5, 80.2, 80.9, 81.6, 82.3, 83.0, 83.7, 84.4, 85.1, 85.8],
    15: [86.5, 87.2, 87.9, 88.6, 89.3, 90.0, 90.7, 91.4, 92.1, 92.8],
    18: [93.5, 94.2, 94.9, 95.6, 96.3, 97.0, 97.7, 98.4, 99.1, 99.8],
    21: [100.5, 101.2, 101.9, 102.6, 103.3, 104.0, 104.7, 105.4, 106.1, 106.8],
    24: [107.5, 108.2, 108.9, 109.6, 110.3, 111.0, 111.7, 112.4, 113.1, 113.8]
};

function getPercentile(value: number, standards: number[]): string {
    if (value <= standards[0]) return '偏低 (<3%)';
    if (value >= standards[standards.length - 1]) return '偏高 (>97%)';
    
    // 简单线性插值
    const index = Math.min(Math.floor((value - standards[0]) / (standards[standards.length - 1] - standards[0]) * 10, 9);
    const percentiles = ['3%', '10%', '15%', '25%', '50%', '75%', '85%', '90%', '97%'];
    return percentiles[index] || '50%';
}

export const growthAssessmentSkill: Skill = {
    name: 'growth-assessment',
    description: '处理宝宝生长发育评估、身高体重、早产儿矫正等问题',
    triggers: GROWTH_KEYWORDS,
    examples: [
        '宝宝发育达标吗？',
        '我家男宝6个月60cm正常吗？',
        '早产儿怎么计算纠正月龄？',
        '宝宝体重偏轻怎么办？'
    ],
    priority: 10,

    match(context: SkillContext): number {
        const { message } = context;
        const lowerMsg = message.toLowerCase();

        let matchCount = 0;
        for (const keyword of GROWTH_KEYWORDS) {
            if (lowerMsg.includes(keyword)) {
                matchCount++;
            }
        }

        // 特定模式
        if (/达标|正常|标准|参考/.test(message)) matchCount += 1;
        if (/kg|厘米|公分/.test(message)) matchCount += 1;
        if (/个月|岁/.test(message)) matchCount += 0.5;

        return Math.min(matchCount / 3, 1);
    },

    async handle(context: SkillContext): Promise<SkillResponse> {
        const { message, babyContext } = context;
        const lowerMsg = message.toLowerCase();
        const suggestions: string[] = [];

        // 纠正月龄计算
        if (['纠正月龄', '早产儿', '矫正月龄'].some(k => lowerMsg.includes(k))) {
            const response = `## 早产儿纠正月龄计算方法

**什么是纠正月龄？**
早产儿（<37周出生）的发育评估需要使用"纠正月龄"，即按照预产期计算宝宝的实际发育月龄。

**计算公式：**
\`\`\`
纠正月龄 = 实际月龄 - (40周 - 出生孕周) / 4
\`\`\`

**或者分步计算：**
1. 计算不足月数 = 40周 - 出生孕周
2. 不足月数转换为周 / 4 = 需减月数
3. 纠正月龄 = 实际月龄 - 需减月数

**举例：**
- 宝宝32周出生，现在实际月龄6个月
- 不足月数 = 40 - 32 = 8周 = 2个月
- 纠正月龄 = 6 - 2 = 4个月

**评估标准：**
- 2岁前使用纠正月龄评估
- 2-3岁可逐渐过渡到实际月龄
- 3岁后基本无需纠正

${babyContext ? `您的宝宝${babyContext.name}现在${babyContext.ageStr}，如果是早产儿，可以告诉我出生孕周，我帮您计算纠正月龄。` : ''}`;

            suggestions.push('我家宝宝发育达标吗？', '怎么促进早产儿发育？');
            return { content: response, suggestions, metadata: { skill: 'growth-assessment', type: 'preterm' } };
        }

        // 发育达标问题
        if (['达标', '正常', '标准', '参考'].some(k => lowerMsg.includes(k))) {
            let response = `## 宝宝发育评估参考

`;

            if (babyContext) {
                const gender = babyContext.gender === '男宝宝' ? 'boy' : 'girl';
                const month = Math.min(babyContext.month, 23);
                const monthGroup = Math.floor(month / 3) * 3;

                const weightTable = gender === 'boy' ? WHO_BOY_WEIGHT : WHO_GIRL_WEIGHT;
                const heightTable = gender === 'boy' ? WHO_BOY_HEIGHT : WHO_GIRL_HEIGHT;

                const weightStandards = weightTable[monthGroup as keyof typeof weightTable] || [10.0];
                const heightStandards = heightTable[monthGroup as keyof typeof heightTable] || [70.0];

                response += `### ${babyContext.name}的发育参考（${babyContext.ageStr}，${babyContext.gender}）

**体重参考（WHO标准）：**
| 百分位 | 体重 |
|--------|------|
| 3rd | ${weightStandards[0].toFixed(1)} kg |
| 50th | ${weightStandards[4].toFixed(1)} kg |
| 97th | ${weightStandards[9].toFixed(1)} kg |

**身高参考（WHO标准）：**
| 百分位 | 身高 |
|--------|------|
| 3rd | ${heightStandards[0].toFixed(1)} cm |
| 50th | ${heightStandards[4].toFixed(1)} cm |
| 97th | ${heightStandards[9].toFixed(1)} cm |

**温馨提示：**
- 50th 百分位是平均值
- 3rd-97th 之间都属于正常范围
- 连续追踪比单次测量更有意义
- 遗传因素也会影响发育`;

                suggestions.push('怎么记录生长发育曲线？', '促进发育该怎么做？');
            } else {
                response += `需要知道宝宝的月龄和性别才能给出具体评估哦～

请告诉我：
- 宝宝现在多大了？
- 是男宝还是女宝？
- 出生孕周是多少（是否早产）？`;
            }

            return { content: response, suggestions, metadata: { skill: 'growth-assessment', type: 'assessment' } };
        }

        // 体重问题
        if (['体重', '长胖', '偏瘦', '低体重', '超重'].some(k => lowerMsg.includes(k))) {
            const response = `## 宝宝体重评估

**体重增长参考：**
- 0-3月：每月增长约 700-800g
- 3-6月：每月增长约 500-600g
- 6-12月：每月增长约 250-300g
- 1岁后：每年增长约 2kg

**体重偏低常见原因：**
1. 喂养不足（奶量不够/辅食摄入不足）
2. 吸收不好（辅食添加不合理）
3. 消耗过大（活动量过大/疾病消耗）
4. 遗传因素（父母体型偏瘦）

**改善建议：**
1. 保证奶量（母乳/配方奶）
2. 辅食添加注意营养密度
3. 养成良好进食习惯
4. 定期体检监测

${babyContext ? `根据${babyContext.name}（${babyContext.ageStr}）的情况，如果体重持续偏低，建议咨询儿科医生。` : ''}`;

            suggestions.push('辅食怎么加有营养？', '食欲不好怎么办？');
            return { content: response, suggestions, metadata: { skill: 'growth-assessment', type: 'weight' } };
        }

        // 身高问题
        if (['身高', '长高', '增高', '矮小'].some(k => lowerMsg.includes(k))) {
            const response = `## 宝宝身高评估

**身高增长规律：**
- 0-3月：每月增长约 3-4cm
- 3-6月：每月增长约 2cm
- 6-12月：每月增长约 1-1.5cm
- 1-2岁：全年增长约 10-12cm
- 2岁后：每年增长约 5-7cm

**促进长高的关键因素：**
1. **营养均衡** - 蛋白质、钙、维生素D
2. **充足睡眠** - 生长激素在睡眠中分泌
3. **适当运动** - 户外活动、跳跃运动
4. **良好姿势** - 避免驼背、高低肩

**身高增长公式（参考）：**
- 1岁时约 75cm
- 2岁时约 85-87cm
- 2岁后：年龄×5 + 80（cm）

**重要提醒：**
- 身高70%取决于遗传
- 3岁前营养为主
- 青春期前是干预的黄金期`;

            suggestions.push('吃什么有助于长高？', '睡眠对身高影响大吗？');
            return { content: response, suggestions, metadata: { skill: 'growth-assessment', type: 'height' } };
        }

        // 默认回答
        const response = `## 生长发育评估

我可以帮您解答以下问题：

**1. 发育是否达标**
- WHO儿童生长发育标准对照
- 体重、身高百分位评估

**2. 早产儿纠正月龄**
- 如何计算纠正月龄
- 纠正月龄的使用方法

**3. 体重问题**
- 体重偏低/偏高的原因
- 喂养调整建议

**4. 身高问题**
- 促进长高的方法
- 各阶段身高增长规律

请具体描述您想了解的问题～`;

        suggestions.push('宝宝发育达标吗？', '怎么计算纠正月龄？');
        return { content: response, suggestions, metadata: { skill: 'growth-assessment', type: 'general' } };
    }
};
