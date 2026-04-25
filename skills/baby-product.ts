/**
 * 母婴产品推荐 Skill
 * 
 * 处理：奶粉、尿布、婴儿车、安全座椅、玩具等产品推荐和评测
 */

import { Skill, SkillContext, SkillResponse } from './index';

// 产品相关关键词
const PRODUCT_KEYWORDS = [
    '奶粉', '奶瓶', '奶嘴', '水杯', '围兜', '餐具',
    '尿布', '纸尿裤', '拉拉裤', '尿裤', '尿不湿',
    '婴儿车', '推车', '出行', '安全座椅', '安全椅',
    '婴儿床', '床', '床垫', '床上用品',
    '奶瓶消毒', '消毒器', '温奶器', '吸奶器',
    '沐浴', '洗发', '护肤', '护臀', '润肤', '抚触',
    '玩具', '早教玩具', '益智玩具', '积木', '绘本',
    '推荐', '哪个好', '性价比', '怎么选', '选购'
];

// 产品分类回答
const PRODUCT_GUIDES: Record<string, { guide: string; tips: string[] }> = {
    '奶粉': {
        guide: `**奶粉选购指南：**

**分段说明：**
- 1段（0-6月）：最接近母乳配方
- 2段（6-12月）：成长配方，添加辅食营养
- 3段（1-3岁）：幼儿配方，以辅食为主

**选购要点：**
1. **奶源** - 澳洲、欧洲奶源较受认可
2. **配方** - DHA、ARA、益生菌、益生元等
3. **品牌** - 选择有历史、口碑好的品牌
4. **渠道** - 官方渠道购买，避免假货

**主流品牌参考：**
- 高端：爱他美、诺优能、皇家美素
- 中端：飞鹤、君乐宝、伊利
- 性价比：旗帜、完达山

**提醒：**
- 6个月内建议纯母乳喂养
- 奶粉不要随意换品牌
- 有问题及时咨询儿科医生`,
        tips: ['奶粉怎么冲泡？', '宝宝不适应奶粉怎么办？']
    },
    '尿布': {
        guide: `**纸尿裤选购指南：**

**选购要点：**
1. **透气性** - 选择透气底膜，减少红屁股
2. **吸水性** - 能快速吸收并锁住尿液
3. **柔软度** - 内层柔软不刺激皮肤
4. **防侧漏** - 有立体护围设计
5. **尺寸合适** - 根据体重选择对应尺码

**各阶段推荐：**
- NB（5kg以下）：新生儿期
- S（4-8kg）：1-3月
- M（6-11kg）：3-6月
- L（9-14kg）：6-12月
- XL（12-17kg）：12月以上

**主流品牌参考：**
- 高端：好奇铂金、帮宝适黑金帮、大王光羽
- 中端：花王、尤妮佳、碧芭宝贝
- 性价比：安尔乐、小鹿叮叮、爹地宝贝

**使用注意：**
- 每2-3小时换一次
- 拉臭臭后立即更换
- 更换时清洁并擦干水分`,
        tips: ['红屁股怎么处理？', '尿布疹怎么预防？']
    },
    '婴儿车': {
        guide: `**婴儿车选购指南：**

**车型对比：**
| 类型 | 优点 | 缺点 | 适合 |
|------|------|------|------|
| 高景观 | 避震好、可平躺、视野高 | 重、占空间 | 0-6月 |
| 轻便伞车 | 轻便折叠、易收纳 | 避震差、不能平躺 | 6月+ |
| 两用型 | 可平躺可坐、性价比高 | 相对较重 | 0-3岁 |

**选购要点：**
1. **安全认证** - 3C认证是基础
2. **避震系统** - 四轮避震更舒适
3. **一键折叠** - 方便操作
4. **双向推行** - 小月龄方便互动
5. **置物空间** - 出门必备

**品牌参考：**
- 高端：Stokke、Bugaboo、Cybex
- 中端：好孩子、昆塔斯、逸乐途
- 性价比：帛琦、五星家政、小龙哈彼

**提醒：**
- 稳定骨架 > 轻便
- 安全带一定要系好
- 定期检查车轮和刹车`,
        tips: ['婴儿车怎么选？', '高景观和伞车哪个好？']
    },
    '安全座椅': {
        guide: `**安全座椅选购指南：**

**安全认证：**
- 中国：3C认证（必须）
- 欧洲：ECE R44/04 或 i-Size
- 美国：FMVSS213

**分组说明：**
- 0组（0-10kg，出生-约9月）：提篮式
- 0+I组（0-18kg，出生-约4岁）：可反向安装
- I组（9-18kg，约9月-4岁）：正向安装
- II+III组（15-36kg，约3-12岁）：增高垫

**选购要点：**
1. **固定方式** - ISOFIX > LATCH > 安全带
2. **反向安装** - 15个月以下必须反向
3. **侧面防护** - 头部和侧面保护
4. **安装指示** - 正确安装比品牌更重要

**品牌参考：**
- 高端：Britax、Maxi-Cosi、Chicco
- 中端：巧儿宜、好孩子、感恩
- 性价比：两只兔子、猫头鹰

**重要提醒：**
- 安全座椅不能安装在副驾驶！
- 每次出行都要使用
- 体重超过36kg或身高超过150cm可不再使用`,
        tips: ['安全座椅怎么安装？', '宝宝不肯坐安全座椅怎么办？']
    },
    '玩具': {
        guide: `**0-3岁玩具选购指南：**

**各阶段适合玩具：**

**0-6月：**
- 黑白卡、布书 - 视觉刺激
- 摇铃、沙锤 - 抓握练习
- 牙胶 - 缓解出牙不适

**6-12月：**
- 积木 - 抓握、堆叠
- 球类 - 爬行追逐
- 推拉玩具 - 学步练习
- 形状配对玩具 - 认知启蒙

**1-2岁：**
- 串珠 - 精细动作
- 涂鸦工具 - 艺术启蒙
- 拼图 - 2-4片开始
- 过家家玩具 - 模仿能力

**2-3岁：**
- 磁力片、积木 - 建构能力
- 轨道玩具 - 空间思维
- 桌游 - 规则意识

**选购原则：**
1. **安全** - 无小零件、无毒材料
2. **适龄** - 符合宝宝发育阶段
3. **简单** - 玩法不要过于复杂
4. **开放性** - 可变通的玩具更好

**品牌参考：**
- 进口：费雪、澳贝、Hape
- 国产：谷雨、木马智慧、澳贝`,
        tips: ['有哪些经典的早教玩具？', '怎么判断玩具是否安全？']
    }
};

export const babyProductSkill: Skill = {
    name: 'baby-product',
    description: '处理母婴产品选购、推荐、评测等问题',
    triggers: PRODUCT_KEYWORDS,
    examples: [
        '什么牌子的奶粉好？',
        '尿布怎么选？',
        '婴儿车推荐哪个？',
        '安全座椅怎么选？',
        '有什么好玩的早教玩具？'
    ],
    priority: 7,

    match(context: SkillContext): number {
        const { message } = context;
        const lowerMsg = message.toLowerCase();

        let matchCount = 0;
        for (const keyword of PRODUCT_KEYWORDS) {
            if (lowerMsg.includes(keyword)) {
                matchCount++;
            }
        }

        // 特定模式
        if (/推荐|哪个好|怎么选|选购|性价比|比较/.test(message)) {
            matchCount += 1;
        }

        return Math.min(matchCount / 2, 1);
    },

    async handle(context: SkillContext): Promise<SkillResponse> {
        const { message, babyContext } = context;
        const lowerMsg = message.toLowerCase();

        // 尝试匹配具体产品类别
        if (lowerMsg.includes('奶粉')) {
            return {
                content: PRODUCT_GUIDES['奶粉'].guide,
                suggestions: PRODUCT_GUIDES['奶粉'].tips,
                metadata: { skill: 'baby-product', category: 'formula' }
            };
        }

        if (['尿布', '纸尿裤', '拉拉裤', '尿不湿'].some(k => lowerMsg.includes(k))) {
            return {
                content: PRODUCT_GUIDES['尿布'].guide,
                suggestions: PRODUCT_GUIDES['尿布'].tips,
                metadata: { skill: 'baby-product', category: 'diaper' }
            };
        }

        if (['婴儿车', '推车'].some(k => lowerMsg.includes(k))) {
            return {
                content: PRODUCT_GUIDES['婴儿车'].guide,
                suggestions: PRODUCT_GUIDES['婴儿车'].tips,
                metadata: { skill: 'baby-product', category: 'stroller' }
            };
        }

        if (['安全座椅', '安全椅'].some(k => lowerMsg.includes(k))) {
            return {
                content: PRODUCT_GUIDES['安全座椅'].guide,
                suggestions: PRODUCT_GUIDES['安全座椅'].tips,
                metadata: { skill: 'baby-product', category: 'carseat' }
            };
        }

        if (['玩具', '早教玩具', '益智玩具', '积木'].some(k => lowerMsg.includes(k))) {
            return {
                content: PRODUCT_GUIDES['玩具'].guide,
                suggestions: PRODUCT_GUIDES['玩具'].tips,
                metadata: { skill: 'baby-product', category: 'toy' }
            };
        }

        // 通用产品回答
        const generalGuide = `关于母婴产品选购，我来帮您解答！

**我可以帮您分析：**
- 配方奶/奶粉
- 纸尿裤/尿布
- 婴儿车/推车
- 安全座椅
- 奶瓶/餐具
- 玩具/早教用品
- 洗护用品

**选购基本原则：**
1. **安全第一** - 3C认证、材质安全
2. **适龄选择** - 不同月龄需求不同
3. **口碑参考** - 不盲目跟风
4. **正规渠道** - 避免假货

${babyContext ? `根据${babyContext.name}（${babyContext.ageStr}）的情况，我可以给您更有针对性的建议～` : ''}

请问您想了解什么产品的选购？`;

        return {
            content: generalGuide,
            suggestions: ['婴儿车选购指南', '纸尿裤推荐', '早教玩具清单'],
            metadata: { skill: 'baby-product', category: 'general' }
        };
    }
};
