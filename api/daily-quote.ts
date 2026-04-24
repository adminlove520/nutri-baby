import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const QUOTE_API_URL = 'https://apis.tianapi.com/qihuowenzhen/index';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { key = 'SCYrvkytJze9qyzOh' } = req.query;

        const response = await axios.get(QUOTE_API_URL, {
            params: { key },
            timeout: 5000
        });

        if (response.data?.code === 200 && response.data?.result?.content) {
            const quote = response.data.result;

            return res.status(200).json({
                success: true,
                data: {
                    content: quote.content || quote.encontent || '每天进步一点点',
                    author: quote.author || quote.source || '网络',
                    translation: quote.translation || '',
                    imgUrl: quote.imgUrl || '',
                    type: '每日微情话'
                }
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                content: '陪伴是最长情的告白，守护是最沉默的陪伴。',
                author: '育儿专家',
                translation: '',
                imgUrl: '',
                type: '育儿寄语'
            }
        });

    } catch (error: any) {
        console.error('[DailyQuote] API Error:', error.message);

        return res.status(200).json({
            success: true,
            data: {
                content: '每一个宝宝都是上天赐予的最珍贵的礼物，愿每位父母都能珍惜这份缘分。',
                author: '育儿专家',
                translation: '',
                imgUrl: '',
                type: '育儿寄语'
            }
        });
    }
}

export const config = {
    maxDuration: 30,
};
