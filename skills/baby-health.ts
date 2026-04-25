/**
 * 宝宝健康 Skill
 * 
 * 处理：喂养、睡眠、健康、护理等问题
 */

import { Skill, SkillContext, SkillResponse } from './index';

// 关键词匹配表
const HEALTH_TRIGGERS = {
    // 喂养相关
    'feeding': ['喂养', '吃奶', '厌奶', '吐奶', '辅食', '断奶', '奶量', '母乳', '配方奶', '奶粉', '奶瓶'],
    // 睡眠相关
    'sleep': ['睡眠', '睡', '夜醒', '哄睡', '睡整觉', '睡眠时间', '白天睡觉', '晚上哭闹'],
    // 健康相关
    'health': ['发烧', '发热', '感冒', '咳嗽', '腹泻', '便秘', '湿疹', '红屁股', '痱子', '过敏', '鼻塞', '呕吐'],
    // 护理相关
    'care': ['护理', '洗澡', '抚触', '脐带', '指甲', '理发', '换尿布', '尿布疹', '皮肤', '口水疹'],
    // 发育相关
    'growth': ['发育', '翻身', '坐', '爬', '站', '走', '说话', '长牙', '牙'],
};

// 计算匹配度
function calculateMatch(message: string, triggers: string[]): number {
    const lowerMsg = message.toLowerCase();
    let matched = 0;
    for (const trigger of triggers) {
        if (lowerMsg.includes(trigger.toLowerCase())) {
            matched++;
        }
    }
    return Math.min(matched / 2, 1);  // 最多匹配2个关键词就满分
}

export const babyHealthSkill: Skill = {
    name: 'baby-health',
    description: '处理宝宝健康、喂养、睡眠、护理等问题',
    triggers: [
        '喂养', '吃奶', '厌奶', '吐奶', '辅食', '断奶', '奶量',
        '睡眠', '夜醒', '哄睡', '睡整觉',
        '发烧', '感冒', '咳嗽', '腹泻', '便秘', '湿疹',
        '护理', '洗澡', '抚触', '换尿布',
        '发育', '翻身', '长牙', '说话', '爬', '走', '站'
    ],
    examples: [
        '宝宝2个月，厌奶怎么办？',
        '宝宝夜里经常哭闹是怎么回事？',
        '辅食什么时候添加比较好？',
        '宝宝发烧了怎么护理？'
    ],
    priority: 10,

    match(context: SkillContext): number {
        const { message } = context;
        const lowerMsg = message.toLowerCase();
        
        // 直接匹配关键词
        const allTriggers = Object.values(HEALTH_TRIGGERS).flat();
        let matchCount = 0;
        for (const trigger of allTriggers) {
            if (lowerMsg.includes(trigger)) {
                matchCount++;
            }
        }

        // 特定模式匹配
        if (/宝宝.*(怎么办|怎么|如何)/.test(message)) matchCount += 0.5;
        if (/个月/.test(message)) matchCount += 0.3;

        return Math.min(matchCount / 3, 1);
    },

    async handle(context: SkillContext): Promise<SkillResponse> {
        const { message, babyContext } = context;
        const lowerMsg = message.toLowerCase();

        // 根据内容类型生成专业回答
        let response = '';
        const suggestions: string[] = [];

        // 月龄信息
        const monthStr = babyContext ? `${babyContext.month}个月` : '';

        // 喂养问题
        if (['喂养', '吃奶', '厌奶', '吐奶', '奶量', '母乳', '奶粉', '辅食'].some(k => lowerMsg.includes(k))) {
            if (lowerMsg.includes('厌奶')) {
                response = `宝宝厌奶是很常见的现象，${monthStr ? `对于${monthStr}的宝宝来说，` : ''}可能有以下原因：

**厌奶常见原因：**
1. **生理性厌奶期** - 3-4个月和6-7个月是高发期，宝宝的味觉开始发育
2. **分心** - 宝宝长大了，对周围事物更感兴趣
3. **奶嘴不合适** - 流速太快或太慢
4. **辅食添加过早/过多** - 影响了奶量

**应对建议：**
- 营造安静、固定的喂奶环境
- 少量多餐，不要强迫宝宝
- 可以在宝宝半睡半醒时喂奶
- 厌奶期一般持续1-2周，不用太担心

${babyContext ? `注意：${babyContext.name}现在是${babyContext.ageStr}，如果厌奶超过2周或体重下降，建议咨询儿科医生。` : ''}`;

                suggestions.push('宝宝厌奶会影响发育吗？', '辅食添加的顺序是什么？');
            } else if (lowerMsg.includes('辅食')) {
                response = `辅食添加是宝宝成长的重要里程碑！

**添加时间：** 世界卫生组织建议6个月开始添加，我国《婴幼儿喂养指南》也推荐6个月后逐步添加。

**辅食添加原则：**
1. **从少到多** - 从1勺开始，逐渐增加到1餐
2. **从稀到稠** - 米粉→稀粥→稠粥→软饭
3. **从细到粗** - 菜泥→菜碎→菜块
4. **每次只添加一种** - 观察3天有无过敏反应

**辅食添加顺序（参考）：**
- 6个月：强化铁米粉、菜泥、果泥
- 7-9个月：稀粥、烂面条、蛋黄、肉泥、鱼泥
- 10-12个月：软饭、碎菜、蛋、豆腐、肉末`;

                suggestions.push('第一口辅食吃什么好？', '辅食能加盐吗？');
            } else {
                response = `关于宝宝喂养问题，让我给您一些专业建议：

**科学喂养要点：**
${babyContext ? `- ${babyContext.name}现在是${babyContext.ageStr}，每天需要奶量约${getMilkAmount(babyContext.month)}ml` : ''}

**常见喂养问题：**
- 吐奶：喂奶后拍嗝，竖抱15-20分钟
- 奶量不足：检查奶嘴孔径，适当增加喂养次数
- 厌奶：少量多餐，不要强迫，保持喂奶环境安静`;

                suggestions.push('怎么判断宝宝吃饱了？', '早产儿喂养有什么不同？');
            }
        }
        // 睡眠问题
        else if (['睡眠', '睡', '夜醒', '哄睡', '睡整觉'].some(k => lowerMsg.includes(k))) {
            response = `宝宝睡眠问题是咨询最多的问题之一！${monthStr ? `${monthStr}的宝宝睡眠模式已经有了很大变化。` : ''}

**各月龄睡眠特点：**
${getSleepGuide(babyContext?.month || 0)}

**改善睡眠的建议：**
1. 建立固定的睡前仪式（洗澡→抚触→喂奶→讲故事）
2. 白天多活动，消耗体力
3. 睡前不要玩得太兴奋
4. 保持室温24-26℃，湿度50-60%
5. 使用睡袋比被子更安全

**夜醒的处理：**
- 6个月以下：及时响应，检查是否饿了或尿了
- 6个月以上：先观察1-2分钟，不要马上抱起
- 逐步延长响应时间，培养自主入睡`;

            suggestions.push('宝宝多大可以睡整觉？', '哄睡有什么好方法？');
        }
        // 健康问题
        else if (['发烧', '发热', '感冒', '咳嗽', '腹泻', '便秘', '湿疹', '过敏'].some(k => lowerMsg.includes(k))) {
            if (lowerMsg.includes('发烧') || lowerMsg.includes('发热')) {
                response = `宝宝发烧是身体在抵抗病原的表现，${monthStr ? `对于${monthStr}的宝宝，` : ''}家长需要密切观察但不要过度紧张。

**发烧处理原则：**
- 38.5℃以下：物理降温为主（温水擦浴、退热贴）
- 38.5℃以上：可服用退热药（对乙酰氨基酚或布洛芬）
- 3个月以下宝宝发烧建议立即就医

**需要及时就医的情况：**
- 持续高热超过24小时
- 出现皮疹、呕吐、腹泻
- 精神状态差、嗜睡
- 出现呼吸困难

**护理要点：**
- 多补充水分
- 不要捂热
- 保持室内通风`;

                suggestions.push('宝宝体温多少算发烧？', '退热药怎么选择？');
            } else if (lowerMsg.includes('湿疹')) {
                response = `湿疹是婴幼儿常见的皮肤问题，${monthStr ? `尤其是${monthStr}的宝宝更容易出现。` : ''}

**湿疹护理要点：**
1. **保湿是关键** - 每天多次涂抹润肤霜，选择无香精、无刺激的产品
2. **避免刺激** - 穿纯棉衣物，洗澡水温不超过37℃
3. **合理用药** - 严重时需在医生指导下使用激素药膏
4. **查找过敏原** - 食物、尘螨、宠物等都可能诱发

**日常预防：**
- 保持皮肤清洁干燥
- 选择温和的婴儿沐浴露
- 指甲剪短，避免抓挠

${babyContext ? `提示：${babyContext.name}处于皮肤敏感期，建议选择专为婴幼儿设计的保湿产品。` : ''}`;

                suggestions.push('湿疹和痱子怎么区分？', '宝宝皮肤干燥用什么润肤霜好？');
            } else {
                response = `宝宝出现这些症状需要细心护理：

**观察要点：**
- 症状持续时间
- 宝宝的精神状态
- 食欲情况
- 是否伴有发热

**一般护理原则：**
- 保持清洁
- 合理饮食
- 密切观察
- 必要时及时就医`;

                suggestions.push('什么情况下需要去医院？', '如何预防这类问题？');
            }
        }
        // 护理问题
        else if (['护理', '洗澡', '抚触', '换尿布', '尿布疹', '皮肤'].some(k => lowerMsg.includes(k))) {
            response = `日常护理是宝宝健康的基础！

**宝宝皮肤护理：**
- 宝宝的皮肤比成人薄30%，需要温和无刺激的护肤品
- 洗澡水温控制在37-38℃，时间不超过10分钟
- 润肤霜建议选择无香精、无酒精的婴儿专用产品

**尿布疹预防：**
- 及时更换尿布
- 温水清洗后轻轻擦干
- 适当让宝宝光屁股透气
- 使用护臀膏形成保护膜`;

            suggestions.push('如何选择婴儿护肤品？', '男宝宝和女宝宝护理有什么区别？');
        }
        // 发育问题
        else if (['发育', '翻身', '爬', '走', '说话', '长牙', '站', '坐'].some(k => lowerMsg.includes(k))) {
            response = `每个宝宝的发育节奏不同，以下是各阶段的大致参考：

**大运动发育里程碑：**
| 月龄 | 典型动作 |
|------|---------|
| 2-3月 | 抬头、侧翻 |
| 4-6月 | 翻身、扶坐 |
| 7-9月 | 独坐、爬行 |
| 10-12月 | 扶站、扶走 |

**提醒：**
- 存在个体差异，晚了1-2个月都是正常的
- 不要过分比较，每个宝宝都有自己的节奏
- 多趴着玩有助于大运动发展`;

            suggestions.push('宝宝发育迟缓怎么办？', '如何促进宝宝大运动发展？');
        }
        else {
            response = `关于宝宝健康护理，让我为您提供专业建议：

**我可以帮您解答：**
- 喂养问题（母乳/配方奶、辅食添加、厌奶等）
- 睡眠问题（夜醒、哄睡、睡眠规律等）
- 常见疾病护理（发烧、感冒、腹泻、湿疹等）
- 日常护理（洗澡、抚触、皮肤护理等）
- 发育监测（翻身、爬行、说话等）

请具体描述您想了解的问题，我会给出针对性的建议！`;

            suggestions.push('宝宝常见问题汇总', '如何判断宝宝是否健康？');
        }

        return {
            content: response,
            suggestions,
            metadata: { skill: 'baby-health' }
        };
    }
};

// 辅助函数：根据月龄返回奶量建议
function getMilkAmount(month: number): string {
    if (month < 1) return '600-800';
    if (month < 3) return '800-900';
    if (month < 6) return '900-1000';
    if (month < 12) return '600-800';
    return '500左右（以辅食为主）';
}

// 辅助函数：根据月龄返回睡眠指南
function getSleepGuide(month: number): string {
    if (month < 1) {
        return `- 每天睡眠：16-20小时
- 白天：4-5次小睡
- 夜间：2-3小时一次喂奶`;
    } else if (month < 3) {
        return `- 每天睡眠：14-17小时
- 白天：3-4次小睡
- 夜间：可以开始睡整觉`;
    } else if (month < 6) {
        return `- 每天睡眠：12-16小时
- 白天：2-3次小睡
- 夜间：可以连续睡6-8小时`;
    } else if (month < 12) {
        return `- 每天睡眠：11-14小时
- 白天：2次小睡
- 夜间：可以睡整觉`;
    } else {
        return `- 每天睡眠：11-13小时
- 白天：1-2次小睡
- 夜间：睡整觉`;
    }
}
