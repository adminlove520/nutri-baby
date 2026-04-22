import { AIProvider } from './types';
import { GeminiProvider } from './providers/gemini';
import { MinimaxProvider } from './providers/minimax';

export type ProviderType = 'gemini' | 'openai' | 'doubao' | 'minimax';

export class AIFactory {
    static createProvider(type?: ProviderType): AIProvider {
        const providerType = (type || process.env.AI_PROVIDER || 'minimax') as ProviderType;
        const apiKey = process.env.AI_API_KEY || process.env.MINIMAX_API_KEY || 'mock-key';
        const model = process.env.AI_MODEL || 'abab6.5s-chat';
        const groupId = process.env.MINIMAX_GROUP_ID || '';

        switch (providerType) {
            case 'gemini':
                return new GeminiProvider(apiKey);
            case 'minimax':
            default:
                return new MinimaxProvider(apiKey, groupId, model);
        }
    }
}
