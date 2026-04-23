import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../lib/auth';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (req.method === 'GET') {
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
            userId
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
                    baby: { select: { id: true, name: true } }
                }
            }),
            prisma.babyAlbum.count({ where })
        ]);

        return res.status(200).json({
            records,
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
