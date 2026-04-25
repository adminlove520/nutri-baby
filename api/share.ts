import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { success, error, safeJSON } from '../lib/utils';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { token } = req.query;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: '缺少分享 token' });
    }

    try {
        // 解码 token: base64url(id-timestamp)
        let albumId: number;
        try {
            const decoded = Buffer.from(token, 'base64url').toString('utf-8');
            const parts = decoded.split('-');
            albumId = parseInt(parts[0]);
            if (isNaN(albumId)) {
                throw new Error('Invalid token format');
            }
        } catch (e) {
            return res.status(400).json({ message: '无效的分享链接' });
        }

        // 查询相册记录
        const album = await prisma.babyAlbum.findFirst({
            where: {
                id: albumId,
                deletedAt: null
            },
            include: {
                baby: {
                    select: {
                        id: true,
                        name: true,
                        birthDate: true,
                        gender: true
                    }
                },
                user: {
                    select: {
                        nickname: true
                    }
                }
            }
        });

        if (!album) {
            return res.status(404).json({ message: '分享内容不存在或已被删除' });
        }

        // 返回分享信息
        return success(res, {
            type: album.albumType,
            title: album.title || getDefaultTitle(album.albumType),
            description: album.description,
            url: album.url.split(',')[0], // 第一张图片
            allUrls: album.url.split(','), // 所有图片
            babyName: album.baby?.name,
            babyBirthDate: album.baby?.birthDate,
            userName: album.user?.nickname,
            createdAt: album.createdAt
        });

    } catch (err: any) {
        console.error('Share API error:', err);
        return error(res, '获取分享内容失败');
    }
}

function getDefaultTitle(type: string): string {
    switch (type) {
        case 'growth':
            return '成长记录';
        case 'moment':
            return '精彩瞬间';
        case 'vaccine':
            return '疫苗接种';
        default:
            return '宝宝记录';
    }
}
