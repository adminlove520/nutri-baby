/**
 * 图片迁移脚本：将 Vercel Blob 图片迁移到 GitHub 图床
 * 
 * 使用方式：
 * 1. 确保已配置 GitHub Token（在 Vercel 环境变量或数据库中）
 * 2. 运行：npx tsx scripts/migrate-images.ts
 * 3. 或者部署后访问 /api/cron/migrate-images（需要认证）
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { GitHubUploader, generateAlbumPath, generateFilename } from '../lib/github';

const BLOB_HOSTS = ['vercel-blob.com', 'blob.vercel.com'];

interface MigrationResult {
    success: number;
    failed: number;
    errors: string[];
}

async function migrateImage(url: string, babyId?: bigint, albumType?: string): Promise<string | null> {
    try {
        // 检查是否是 Vercel Blob URL
        const isBlobUrl = BLOB_HOSTS.some(host => url.includes(host));
        if (!isBlobUrl) {
            return url; // 已经是其他图床，跳过
        }

        // 下载图片
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');

        // 获取宝宝名称
        let babyName = '未知宝宝';
        if (babyId) {
            const baby = await prisma.baby.findUnique({ where: { id: babyId } });
            if (baby) babyName = baby.name;
        }

        // 生成路径
        const date = new Date();
        const folderPath = generateAlbumPath(albumType || 'growth', babyName, date);
        const filename = generateFilename('migrated.jpg', 0);

        // 从数据库获取用户的 GitHub 配置
        // 这里需要查询使用这个图片的用户的配置
        const album = await prisma.babyAlbum.findFirst({
            where: { url: { contains: url.split('/').pop() || '' } },
            include: { baby: true }
        });

        if (!album) {
            throw new Error('Cannot find album record');
        }

        const config = await prisma.gitHubConfig.findUnique({
            where: { userId: album.userId }
        });

        if (!config || !config.token) {
            throw new Error('GitHub not configured for this user');
        }

        // 上传到 GitHub
        const uploader = new GitHubUploader({
            token: config.token,
            owner: config.owner,
            repo: config.repo,
            branch: config.branch || 'main',
            basePath: config.basePath || ''
        });

        const result = await uploader.uploadFile(Buffer.from(base64, 'base64'), filename, folderPath);

        if (result.success && result.url) {
            console.log(`Migrated: ${url} -> ${result.url}`);
            return result.url;
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error: any) {
        console.error(`Migration failed for ${url}:`, error.message);
        return null;
    }
}

export async function migrateAllImages(): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: 0,
        failed: 0,
        errors: []
    };

    try {
        // 查找所有使用 Vercel Blob 的相册记录
        const albums = await prisma.babyAlbum.findMany({
            where: {
                url: {
                    contains: 'vercel-blob'
                },
                deletedAt: null
            },
            include: {
                baby: true
            }
        });

        console.log(`Found ${albums.length} albums with Vercel Blob images to migrate`);

        for (const album of albums) {
            const urls = album.url.split(',');
            const newUrls: string[] = [];

            for (const url of urls) {
                const trimmedUrl = url.trim();
                if (!trimmedUrl) continue;

                const isBlob = BLOB_HOSTS.some(host => trimmedUrl.includes(host));
                if (!isBlob) {
                    newUrls.push(trimmedUrl); // 非 Blob URL 保留
                    continue;
                }

                // 迁移单个图片
                const newUrl = await migrateImage(
                    trimmedUrl,
                    album.babyId,
                    album.albumType
                );

                if (newUrl) {
                    newUrls.push(newUrl);
                    result.success++;
                } else {
                    newUrls.push(trimmedUrl); // 迁移失败保留原 URL
                    result.failed++;
                    result.errors.push(`Failed to migrate: ${trimmedUrl}`);
                }
            }

            // 更新数据库
            await prisma.babyAlbum.update({
                where: { id: album.id },
                data: { url: newUrls.join(',') }
            });

            console.log(`Updated album ${album.id}: ${album.url} -> ${newUrls.join(',')}`);
        }

        return result;
    } catch (error: any) {
        console.error('Migration error:', error);
        result.errors.push(error.message);
        return result;
    }
}

// API endpoint for manual trigger
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 简单的密钥验证
    const authKey = req.headers['x-migration-key'];
    const expectedKey = process.env.MIGRATION_SECRET || 'migration-key';
    
    if (authKey !== expectedKey) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Starting image migration...');
    const result = await migrateAllImages();

    return res.status(200).json({
        message: 'Migration completed',
        ...result
    });
}

// 如果直接运行脚本
if (require.main === module) {
    migrateAllImages()
        .then(result => {
            console.log('\n=== Migration Summary ===');
            console.log(`Success: ${result.success}`);
            console.log(`Failed: ${result.failed}`);
            if (result.errors.length > 0) {
                console.log('Errors:', result.errors);
            }
            process.exit(result.failed > 0 ? 1 : 0);
        })
        .catch(console.error);
}
