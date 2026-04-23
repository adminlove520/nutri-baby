import { AIProvider } from './types';
import { GeminiProvider } from './providers/gemini';
import { MinimaxProvider } from './providers/minimax';

export type ProviderType = 'gemini' | 'openai' | 'doubao' | 'minimax';

export class AIFactory {
    static createProvider(type?: ProviderType): AIProvider {
        const providerType = (type || process.env.AI_PROVIDER || 'minimax') as ProviderType;
        const apiKey = process.env.AI_API_KEY || process.env.MINIMAX_API_KEY;
        const model = process.env.AI_MODEL || 'MiniMax-M2.7';
        const groupId = process.env.MINIMAX_GROUP_ID || '';

        if (!apiKey) {
            console.warn('AI_API_KEY is missing, falling back to mock provider');
            return {
                analyze: async () => ({
                    insight: "育儿小贴士：保持宝宝皮肤清洁干燥，预防湿疹。建议每天温水洗澡，涂抹婴儿润肤乳。",
                    recommendations: ["每日洗澡", "涂抹润肤乳"],
                    sentiment: "positive"
                })
            };
        }

        switch (providerType) {
            case 'gemini':
                return new GeminiProvider(apiKey);
            case 'minimax':
            default:
                return new MinimaxProvider(apiKey, groupId, model);
        }
    }
}
