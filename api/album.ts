import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../lib/auth';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { action } = req.query;

    if (action === 'comment') {
        if (req.method === 'POST') return handleComment(req, res, user.id);
        if (req.method === 'DELETE') return handleDeleteComment(req, res, user.id);
    } else if (action === 'like') {
        if (req.method === 'POST') return handleLike(req, res, user.id);
        if (req.method === 'DELETE') return handleUnlike(req, res, user.id);
    } else if (req.method === 'GET') {
        return handleGet(req, res, user.id);
    } else if (req.method === 'POST') {
        return handlePost(req, res, user.id);
    } else if (req.method === 'PUT') {
        return handlePut(req, res, user.id);
    } else if (req.method === 'DELETE') {
        return handleDelete(req, res, user.id);
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}

async function handleGet(req: VercelRequest, res: VercelResponse, userId: number) {
    const { babyId, albumType, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    try {
        const where: any = {
            deletedAt: null,
        };

        if (babyId) {
            where.babyId = parseInt(babyId as string);
        }

        if (albumType) {
            where.albumType = albumType;
        }

        const [records, total] = await Promise.all([
            prisma.babyAlbum.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                include: {
                    baby: { select: { id: true, name: true } },
                    user: { select: { id: true, nickname: true, avatar: true } },
                    comments: {
                        where: { deletedAt: null, parentId: null },
                        orderBy: { createdAt: 'asc' },
                        take: 3,
                        include: {
                            user: { select: { id: true, nickname: true, avatar: true } },
                            replies: {
                                where: { deletedAt: null },
                                orderBy: { createdAt: 'asc' },
                                take: 2,
                                include: {
                                    user: { select: { id: true, nickname: true, avatar: true } }
                                }
                            }
                        }
                    },
                    likes: {
                        where: { },
                        include: {
                            user: { select: { id: true, nickname: true } }
                        }
                    },
                    _count: {
                        select: { comments: { where: { deletedAt: null } }, likes: true }
                    }
                }
            }),
            prisma.babyAlbum.count({ where })
        ]);

        const formatted = records.map(r => ({
            ...r,
            isLiked: r.likes.some(l => l.userId === userId),
            comments: r.comments.map(c => ({
                ...c,
                replyCount: c.replies.length,
                replies: c.replies
            }))
        }));

        return res.status(200).json({
            records: formatted,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (error: any) {
        console.error('Album fetch error:', error);
        return res.status(500).json({ message: `获取相册失败: ${error.message}` });
    }
}

async function handlePost(req: VercelRequest, res: VercelResponse, userId: number) {
    const { babyId, title, description, url, filename, fileSize, mimeType, width, height, albumType, time } = req.body;

    if (!babyId || !url || !filename) {
        return res.status(400).json({ message: '缺少必填参数' });
    }

    try {
        const record = await prisma.babyAlbum.create({
            data: {
                babyId: parseInt(babyId),
                userId,
                title,
                description,
                url,
                filename,
                fileSize,
                mimeType,
                width,
                height,
                albumType: albumType || 'growth',
                time: time ? new Date(time) : null
            }
        });

        return res.status(200).json(record);
    } catch (error: any) {
        console.error('Album create error:', error);
        return res.status(500).json({ message: `创建相册记录失败: ${error.message}` });
    }
}

async function handlePut(req: VercelRequest, res: VercelResponse, userId: number) {
    const { id, title, description, albumType, time } = req.body;

    if (!id) {
        return res.status(400).json({ message: '缺少记录ID' });
    }

    try {
        const existing = await prisma.babyAlbum.findFirst({
            where: { id: parseInt(id), userId, deletedAt: null }
        });

        if (!existing) {
            return res.status(404).json({ message: '记录不存在或无权修改' });
        }

        const record = await prisma.babyAlbum.update({
            where: { id: parseInt(id) },
            data: {
                title,
                description,
                albumType,
                time: time ? new Date(time) : undefined
            }
        });

        return res.status(200).json(record);
    } catch (error: any) {
        console.error('Album update error:', error);
        return res.status(500).json({ message: `更新相册记录失败: ${error.message}` });
    }
}

async function handleDelete(req: VercelRequest, res: VercelResponse, userId: number) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: '缺少记录ID' });
    }

    try {
        const existing = await prisma.babyAlbum.findFirst({
            where: { id: parseInt(id as string), userId, deletedAt: null }
        });

        if (!existing) {
            return res.status(404).json({ message: '记录不存在或无权删除' });
        }

        await prisma.babyAlbum.update({
            where: { id: parseInt(id as string) },
            data: { deletedAt: new Date() }
        });

        return res.status(200).json({ message: '删除成功' });
    } catch (error: any) {
        console.error('Album delete error:', error);
        return res.status(500).json({ message: `删除相册记录失败: ${error.message}` });
    }
}

async function handleComment(req: VercelRequest, res: VercelResponse, userId: number) {
    if (req.method === 'POST') {
        const { albumId, content, parentId } = req.body;

        if (!albumId || !content) {
            return res.status(400).json({ message: '缺少必填参数' });
        }

        try {
            const comment = await prisma.albumComment.create({
                data: {
                    albumId: parseInt(albumId),
                    userId,
                    content,
                    parentId: parentId ? parseInt(parentId) : null
                },
                include: {
                    user: { select: { id: true, nickname: true, avatar: true } }
                }
            });

            return res.status(200).json(comment);
        } catch (error: any) {
            console.error('Comment create error:', error);
            return res.status(500).json({ message: `评论失败: ${error.message}` });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}

async function handleDeleteComment(req: VercelRequest, res: VercelResponse, userId: number) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: '缺少评论ID' });
    }

    try {
        const existing = await prisma.albumComment.findFirst({
            where: { id: parseInt(id as string), userId, deletedAt: null }
        });

        if (!existing) {
            return res.status(404).json({ message: '评论不存在或无权删除' });
        }

        await prisma.albumComment.update({
            where: { id: parseInt(id as string) },
            data: { deletedAt: new Date() }
        });

        return res.status(200).json({ message: '删除成功' });
    } catch (error: any) {
        console.error('Comment delete error:', error);
        return res.status(500).json({ message: `删除评论失败: ${error.message}` });
    }
}

async function handleLike(req: VercelRequest, res: VercelResponse, userId: number) {
    const { albumId } = req.body;

    if (!albumId) {
        return res.status(400).json({ message: '缺少相册ID' });
    }

    try {
        const existing = await prisma.albumLike.findFirst({
            where: { albumId: parseInt(albumId), userId }
        });

        if (existing) {
            return res.status(200).json({ message: '已经点赞过了', liked: true });
        }

        await prisma.albumLike.create({
            data: {
                albumId: parseInt(albumId),
                userId
            }
        });

        return res.status(200).json({ message: '点赞成功', liked: true });
    } catch (error: any) {
        console.error('Like error:', error);
        return res.status(500).json({ message: `点赞失败: ${error.message}` });
    }
}

async function handleUnlike(req: VercelRequest, res: VercelResponse, userId: number) {
    const { albumId } = req.query;

    if (!albumId) {
        return res.status(400).json({ message: '缺少相册ID' });
    }

    try {
        await prisma.albumLike.deleteMany({
            where: { albumId: parseInt(albumId as string), userId }
        });

        return res.status(200).json({ message: '取消点赞成功', liked: false });
    } catch (error: any) {
        console.error('Unlike error:', error);
        return res.status(500).json({ message: `取消点赞失败: ${error.message}` });
    }
}
