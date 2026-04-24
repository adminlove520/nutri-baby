import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const HITOKOTO_API = 'https://v1.hitokoto.cn';

interface HitokotoResponse {
    id: number;
    hitokoto: string;
    type: string;
    from: string;
    from_who: string | null;
    creator: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const response = await axios.get<HitokotoResponse>(HITOKOTO_API, {
            timeout: 5000
        });

        if (response.data?.hitokoto) {
            const quote = response.data;
            const typeMap: Record<string, string> = {
                'a': '动画',
                'b': '漫画',
                'c': '游戏',
                'd': '文学',
                'e': '原创',
                'f': '网络',
                'g': '其他',
                'h': '影视',
                'i': '诗词',
                'j': '歌词',
                'k': '台词',
                'l': '哲学'
            };

            return res.status(200).json({
                success: true,
                data: {
                    content: quote.hitokoto,
                    author: quote.from_who || quote.from || '佚名',
                    source: quote.from,
                    type: typeMap[quote.type] || '名言',
                    category: quote.type
                }
            });
        }

        return fallbackQuote();

    } catch (error: any) {
        console.error('[DailyQuote] API Error:', error.message);
        return fallbackQuote();
    }
}

function fallbackQuote() {
    return res.status(200).json({
        success: true,
        data: {
            content: '陪伴是最长情的告白，守护是最沉默的陪伴。',
            author: '育儿专家',
            source: '育儿语录',
            type: '育儿寄语',
            category: 'original'
        }
    });
}

export const config = {
    maxDuration: 30,
};
