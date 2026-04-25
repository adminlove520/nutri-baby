/**
 * 疫苗接种 Skill
 * 
 * 处理：疫苗接种时间、反应、注意事项等问题
 */

import { Skill, SkillContext, SkillResponse } from './index';

// 疫苗相关关键词
const VACCINE_KEYWORDS = [
    '疫苗', '接种', '打针', '防疫', '针', '预防针',
    '卡介苗', '乙肝', '脊灰', '百白破', '麻疹', '流脑', '乙脑', '甲肝',
    '肺炎', '流感', '水痘', '手足口', '轮状'
];

// 常见问题模板
const VACCINE_QA: Record<string, { answer: string; suggestions: string[] }> = {
    'time': {
        answer: `关于疫苗接种时间，我来帮您梳理：

**一类疫苗（免费）接种时间表：**

| 年龄 | 疫苗 |
|------|------|
| 出生时 | 乙肝① + 卡介苗 |
| 1月龄 | 乙肝② |
| 2月龄 | 脊灰① |
| 3月龄 | 脊灰② + 百白破① |
| 4月龄 | 脊灰③ + 百白破② |
| 5月龄 | 百白破③ |
| 6月龄 | 乙肝③ + 流脑① |
| 8月龄 | 麻疹① + 乙脑① |
| 9月龄 | 流脑② |

**注意事项：**
- 接种时间可以适当推迟，但不能提前
- 两针间隔至少28天
- 如有不适可推迟接种，恢复后及时补种

具体每种疫苗的接种时间还需根据宝宝的出生日期来计算。`,
        suggestions: ['疫苗可以推迟接种吗？', '同时接种多种疫苗安全吗？']
    },
    'reaction': {
        answer: `接种疫苗后可能出现以下反应，大多是正常的：

**常见反应（一般24-48小时消失）：**
- 注射部位红肿、疼痛
- 低热（38.5℃以下）
- 烦躁、哭闹
- 食欲下降

**处理方法：**
- 红肿：24小时内冷敷，24小时后热敷
- 发热：多喝水，体温>38.5℃可用退热药
- 烦躁：多安抚，抱一抱

**异常反应（需就医）：**
- 高热持续不退（>39℃）
- 注射部位红肿扩散
- 出现皮疹、呼吸困难
- 精神萎靡、嗜睡

建议接种后现场观察30分钟再离开。`,
        suggestions: ['哪些疫苗反应比较大？', '宝宝过敏体质能打疫苗吗？']
    },
    'fever': {
        answer: `接种疫苗后发热是常见反应，让我来解释：

**为什么发热？**
疫苗本质是减毒或灭活的病原体，宝宝的免疫系统会产生应答反应，可能导致体温升高。这是建立免疫的过程，不是坏事。

**如何判断是否是疫苗引起的？**
- 通常发生在接种后6-24小时
- 体温不超过38.5℃
- 持续时间不超过48小时
- 宝宝精神状态好

**处理方法：**
1. 38.5℃以下：物理降温为主
   - 温水擦浴（额头、腋下、腹股沟）
   - 退热贴
   - 多喂奶/水

2. 38.5℃以上：考虑用退热药
   - 对乙酰氨基酚（泰诺林）
   - 布洛芬（美林，需6个月以上）

**需要就医的情况：**
- 体温持续>39℃超过24小时
- 出现高热惊厥
- 伴随呕吐、皮疹等其他症状`,
        suggestions: ['如何正确测量体温？', '高热惊厥怎么处理？']
    },
    'appoint': {
        answer: `预约疫苗接种的方法：

**线上预约（推荐）：**
1. 各地疾控中心公众号/APP
2. 社区卫生服务中心公众号
3. 支付宝/微信 - 疫苗服务

**电话预约：**
- 宝宝所在社区的社区卫生服务中心
- 提前咨询所需证件

**需要携带：**
- 宝宝预防接种证
- 出生证明
- 户口本（如已入户）
- 监护人身份证

**小贴士：**
- 预约成功后按时到达
- 提前给宝宝穿容易暴露注射部位的衣服
- 带上退热贴，以防不时之需`,
        suggestions: ['如何查询附近接种点？', '在外地可以打疫苗吗？']
    }
};

export const vaccineSkill: Skill = {
    name: 'vaccine',
    description: '处理疫苗接种时间、反应、预约等问题',
    triggers: VACCINE_KEYWORDS,
    examples: [
        '疫苗接种时间表是什么样的？',
        '打完疫苗发烧怎么办？',
        '如何预约疫苗接种？',
        '哪些疫苗是必须打的？'
    ],
    priority: 9,

    match(context: SkillContext): number {
        const { message } = context;
        const lowerMsg = message.toLowerCase();

        let matchCount = 0;
        for (const keyword of VACCINE_KEYWORDS) {
            if (lowerMsg.includes(keyword)) {
                matchCount++;
            }
        }

        // 特定模式
        if (/疫苗.*时间|接种.*时间|什么时候.*疫苗|几月.*疫苗/.test(message)) {
            matchCount += 2;
        }
        if (/疫苗.*反应|发烧.*疫苗|打完.*发烧|接种.*发烧/.test(message)) {
            matchCount += 2;
        }
        if (/疫苗.*预约|怎么.*预约|在哪里.*预约/.test(message)) {
            matchCount += 2;
        }

        return Math.min(matchCount / 3, 1);
    },

    async handle(context: SkillContext): Promise<SkillResponse> {
        const { message, babyContext } = context;
        const lowerMsg = message.toLowerCase();

        // 根据内容路由到具体问题
        if (/时间.*表|接种.*时间|什么时候.*疫苗|几月.*疫苗|月龄.*疫苗/.test(message)) {
            return {
                content: VACCINE_QA.time.answer + (babyContext ? `\n\n另外，${babyContext.name}现在${babyContext.ageStr}，根据国家免疫规划，接下来需要接种的疫苗是...` : ''),
                suggestions: VACCINE_QA.time.suggestions,
                metadata: { skill: 'vaccine', type: 'schedule' }
            };
        }

        if (/反应|发烧|发热|红肿|疼痛|哭闹/.test(message) && /疫苗|接种|打针/.test(message)) {
            return {
                content: VACCINE_QA.reaction.answer,
                suggestions: VACCINE_QA.reaction.suggestions,
                metadata: { skill: 'vaccine', type: 'reaction' }
            };
        }

        if (/发烧|发热/.test(message) && /疫苗|接种/.test(message)) {
            return {
                content: VACCINE_QA.fever.answer,
                suggestions: VACCINE_QA.fever.suggestions,
                metadata: { skill: 'vaccine', type: 'fever' }
            };
        }

        if (/预约|怎么预约|哪里预约|在哪儿预约/.test(message)) {
            return {
                content: VACCINE_QA.appoint.answer,
                suggestions: VACCINE_QA.appoint.suggestions,
                metadata: { skill: 'vaccine', type: 'appointment' }
            };
        }

        // 默认回答
        const defaultAnswer = `关于疫苗接种，我来帮您解答：

**最常问的问题：**

1. **接种时间** - 宝宝出生后按照0-12月龄的时间表接种
2. **常见反应** - 轻微发热、红肿是正常的
3. **注意事项** - 接种后观察30分钟，保持注射部位清洁

${babyContext ? `根据${babyContext.name}（${babyContext.ageStr}）的情况，我可以帮您查看具体的接种计划。` : ''}

您想了解哪方面的内容？`;

        return {
            content: defaultAnswer,
            suggestions: ['查看接种时间表', '了解接种后护理', '如何预约接种'],
            metadata: { skill: 'vaccine', type: 'general' }
        };
    }
};
