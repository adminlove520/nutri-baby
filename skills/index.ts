/**
 * 小溪Skills框架
 * 
 * 标准化Skill定义，方便扩展新的功能模块
 */

export interface SkillContext {
    userId: string;
    babyId?: string;
    babyContext?: {
        name: string;
        gender: 'male' | 'female';
        month: number;
        days: number;
        ageStr: string;
    };
    message: string;
    history: SkillMessage[];
}

export interface SkillMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface SkillResponse {
    content: string;
    suggestions?: string[];  // 建议追问的问题
    metadata?: Record<string, any>;
}

export interface Skill {
    name: string;
    description: string;
    triggers: string[];  // 触发关键词
    examples?: string[];  // 示例问题
    priority: number;  // 优先级，数字越大优先级越高
    
    /**
     * 判断消息是否应该触发此Skill
     */
    match(context: SkillContext): number;  // 返回0-1的匹配度

    /**
     * 处理消息
     */
    handle(context: SkillContext): Promise<SkillResponse>;
}

// Skills 注册表
import { babyHealthSkill } from './baby-health';
import { vaccineSkill } from './vaccine';
import { earlyEducationSkill } from './early-education';
import { babyProductSkill } from './baby-product';

export const skillsRegistry: Record<string, Skill> = {
    'baby-health': babyHealthSkill,
    'vaccine': vaccineSkill,
    'early-education': earlyEducationSkill,
    'baby-product': babyProductSkill,
};

/**
 * 路由消息到合适的Skill
 */
export async function routeToSkill(context: SkillContext): Promise<SkillResponse | null> {
    let bestMatch: { skill: Skill; score: number } | null = null;

    for (const skill of Object.values(skillsRegistry)) {
        const score = skill.match(context);
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { skill, score };
        }
    }

    if (bestMatch && bestMatch.score > 0.3) {
        console.log(`[Skills] Routed to "${bestMatch.skill.name}" with score ${bestMatch.score}`);
        return bestMatch.skill.handle(context);
    }

    return null;
}

/**
 * 获取所有可用的快捷问题
 */
export function getSkillSuggestions(context: SkillContext): Record<string, string[]> {
    const suggestions: Record<string, string[]> = {};

    for (const skill of Object.values(skillsRegistry)) {
        if (skill.examples && skill.match(context) > 0.2) {
            suggestions[skill.name] = skill.examples.slice(0, 3);
        }
    }

    return suggestions;
}
