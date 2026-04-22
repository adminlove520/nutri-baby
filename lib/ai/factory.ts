import { AIProvider } from './types';
import { GeminiProvider } from './providers/gemini';
import { MinimaxProvider } from './providers/minimax';

export type ProviderType = 'gemini' | 'openai' | 'doubao' | 'minimax';

export class AIFactory {
    static createProvider(type?: ProviderType): AIProvider {
        const providerType = type || (process.env.AI_PROVIDER as ProviderType) || 'minimax';
        const apiKey = process.env.AI_API_KEY || 'mock-key';
        const model = process.env.AI_MODEL || 'MiniMax-M2.7';

        switch (providerType) {
            case 'minimax':
                return new MinimaxProvider(apiKey, model);
            case 'gemini':
                return new GeminiProvider(apiKey);
            default:
                return new MinimaxProvider(apiKey, model);
        }
    }
}
