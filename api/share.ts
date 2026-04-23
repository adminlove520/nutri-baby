import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../lib/auth';
import { generateCaption } from '../lib/ai';

const prisma = new PrismaClient();

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://nutri-baby.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (req.method === 'POST') {
        return handleShare(req, res, user.id);
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}

async function handleShare(req: VercelRequest, res: VercelResponse, userId: number) {
    const { albumId, type } = req.body;

    if (!albumId) {
        return res.status(400).json({ message: '缺少相册记录ID' });
    }

    try {
        const album = await prisma.babyAlbum.findFirst({
            where: { id: parseInt(albumId), deletedAt: null },
            include: {
                baby: { select: { id: true, name: true, birthDate: true } },
                user: { select: { nickname: true } }
            }
        });

        if (!album) {
            return res.status(404).json({ message: '记录不存在' });
        }

        const shareToken = Buffer.from(`${album.id}-${Date.now()}`).toString('base64url');
        const shareUrl = `${BASE_URL}/share/${shareToken}`;

        if (type === 'caption') {
            const caption = await generateCaption(album);
            return res.status(200).json({ caption, shareUrl });
        }

        return res.status(200).json({
            shareUrl,
            shareToken,
            album: {
                id: album.id,
                title: album.title,
                description: album.description,
                url: album.url.split(',')[0],
                babyName: album.baby?.name,
                userName: album.user?.nickname
            }
        });
    } catch (error: any) {
        console.error('Share error:', error);
        return res.status(500).json({ message: `分享失败: ${error.message}` });
    }
}

async function generateCaption(album: any): Promise<string> {
    const babyName = album.baby?.name || '宝宝';
    const title = album.title || '';
    const description = album.description || '';
    const createdAt = album.createdAt ? new Date(album.createdAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : '';

    const templates = [
        `📸 ${babyName}的成长记录\n\n${title ? '✨ ' + title + '\n\n' : ''}${description ? description + '\n\n' : ''}记录于 ${createdAt}\n\n🌟 分享自 Nutri-Baby 育儿助手`,
        `👶 ${babyName}成长日记\n\n${description || title || '记录每一个珍贵瞬间'}\n\n📅 ${createdAt}\n\n💕 用爱记录成长，用心守护童年`,
        `✨ 分享 ${babyName} 的美好瞬间 ✨\n\n${title ? '🏷️ ' + title + '\n\n' : ''}${description ? description + '\n\n' : ''}🌈 成长路上，每一步都值得被珍藏\n\n❤️ ${createdAt}`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
}
