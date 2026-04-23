import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../lib/auth';
import { GitHubUploader, generateAlbumPath, generateFilename } from '../lib/github';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { action } = req.query;

    switch (action) {
        case 'get':
            return handleGet(req, res, user.id);
        case 'save':
            return handleSave(req, res, user.id);
        case 'test':
            return handleTest(req, res, user.id);
        case 'sync':
            return handleSync(req, res, user.id);
        case 'logs':
            return handleLogs(req, res, user.id);
        default:
            return res.status(400).json({ message: 'Invalid action' });
    }
}

async function handleGet(req: VercelRequest, res: VercelResponse, userId: number) {
    try {
        const config = await prisma.gitHubConfig.findUnique({
            where: { userId }
        });

        if (!config) {
            return res.status(200).json({ configured: false });
        }

        return res.status(200).json({
            configured: true,
            config: {
                owner: config.owner,
                repo: config.repo,
                branch: config.branch,
                basePath: config.basePath,
                autoSync: config.autoSync,
                syncInterval: config.syncInterval,
                lastSyncAt: config.lastSyncAt
            }
        });
    } catch (error: any) {
        console.error('Get config error:', error);
        return res.status(500).json({ message: `获取配置失败: ${error.message}` });
    }
}

async function handleSave(req: VercelRequest, res: VercelResponse, userId: number) {
    const { token, owner, repo, branch, basePath, autoSync, syncInterval } = req.body;

    if (!token || !owner || !repo) {
        return res.status(400).json({ message: '缺少必填参数' });
    }

    try {
        const config = await prisma.gitHubConfig.upsert({
            where: { userId },
            update: {
                token,
                owner,
                repo,
                branch: branch || 'main',
                basePath,
                autoSync: autoSync || false,
                syncInterval: syncInterval || 'daily',
                updatedAt: new Date()
            },
            create: {
                userId,
                token,
                owner,
                repo,
                branch: branch || 'main',
                basePath,
                autoSync: autoSync || false,
                syncInterval: syncInterval || 'daily'
            }
        });

        return res.status(200).json({
            message: '保存成功',
            config: {
                owner: config.owner,
                repo: config.repo,
                branch: config.branch,
                basePath: config.basePath,
                autoSync: config.autoSync,
                syncInterval: config.syncInterval
            }
        });
    } catch (error: any) {
        console.error('Save config error:', error);
        return res.status(500).json({ message: `保存配置失败: ${error.message}` });
    }
}

async function handleTest(req: VercelRequest, res: VercelResponse, userId: number) {
    const { token, owner, repo } = req.body;

    if (!token || !owner || !repo) {
        return res.status(400).json({ message: '缺少必填参数' });
    }

    try {
        const uploader = new GitHubUploader({ token, owner, repo, branch: 'main' });
        const result = await uploader.testConnection();

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('Test connection error:', error);
        return res.status(500).json({ message: `测试连接失败: ${error.message}` });
    }
}

async function handleSync(req: VercelRequest, res: VercelResponse, userId: number) {
    try {
        const config = await prisma.gitHubConfig.findUnique({
            where: { userId }
        });

        if (!config) {
            return res.status(400).json({ message: '请先配置 GitHub 同步' });
        }

        const uploader = new GitHubUploader({
            token: config.token,
            owner: config.owner,
            repo: config.repo,
            branch: config.branch,
            basePath: config.basePath
        });

        const connectionTest = await uploader.testConnection();
        if (!connectionTest.valid) {
            await prisma.syncLog.create({
                data: {
                    userId,
                    status: 'failed',
                    message: 'GitHub 连接失败',
                    errorLog: connectionTest.message
                }
            });
            return res.status(400).json({ message: connectionTest.message });
        }

        const albums = await prisma.babyAlbum.findMany({
            where: {
                userId,
                deletedAt: null
            },
            include: {
                baby: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        let syncedCount = 0;
        const errors: string[] = [];
        const syncedPaths = new Set<string>();

        for (const album of albums) {
            try {
                const urls = album.url.split(',');
                const babyName = album.baby?.name || '未知宝宝';
                const date = new Date(album.createdAt);
                const baseFolderPath = generateAlbumPath(album.albumType, babyName, date);

                await uploader.createFolder(baseFolderPath);

                for (let i = 0; i < urls.length; i++) {
                    const url = urls[i].trim();
                    const normalizedUrl = url.toLowerCase();

                    if (!url || normalizedUrl.startsWith('data:') ||
                        normalizedUrl.includes('localhost') ||
                        normalizedUrl.includes('127.0.0.1') ||
                        !normalizedUrl.startsWith('http')) {
                        continue;
                    }

                    const filename = generateFilename(`${album.id}_${i}.jpg`, i);
                    const filePath = `${baseFolderPath}/${filename}`;

                    if (syncedPaths.has(filePath)) {
                        continue;
                    }

                    const exists = await uploader.checkFileExists(filePath);
                    if (exists) {
                        syncedPaths.add(filePath);
                        syncedCount++;
                        continue;
                    }

                    const imageResponse = await fetch(url);
                    if (!imageResponse.ok) {
                        errors.push(`图片获取失败: ${url}`);
                        continue;
                    }

                    const imageBuffer = await imageResponse.arrayBuffer();
                    const result = await uploader.uploadFile(
                        Buffer.from(imageBuffer),
                        filename,
                        baseFolderPath
                    );

                    if (result.success) {
                        syncedPaths.add(filePath);
                        syncedCount++;
                    } else {
                        errors.push(result.error || '上传失败');
                    }
                }
            } catch (e: any) {
                errors.push(`相册 ${album.id} 同步错误: ${e.message}`);
            }
        }

        await prisma.gitHubConfig.update({
            where: { userId },
            data: { lastSyncAt: new Date() }
        });

        await prisma.syncLog.create({
            data: {
                userId,
                status: errors.length > 0 ? 'partial' : 'success',
                message: `同步完成，成功 ${syncedCount} 个文件`,
                syncedCount,
                errorLog: errors.length > 0 ? errors.join('\n') : null
            }
        });

        return res.status(200).json({
            message: '同步完成',
            syncedCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error('Sync error:', error);
        await prisma.syncLog.create({
            data: {
                userId,
                status: 'failed',
                message: `同步失败: ${error.message}`
            }
        });
        return res.status(500).json({ message: `同步失败: ${error.message}` });
    }
}

async function handleLogs(req: VercelRequest, res: VercelResponse, userId: number) {
    try {
        const logs = await prisma.syncLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        return res.status(200).json(logs);
    } catch (error: any) {
        console.error('Get logs error:', error);
        return res.status(500).json({ message: `获取日志失败: ${error.message}` });
    }
}
