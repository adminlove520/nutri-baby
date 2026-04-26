/**
 * 图片迁移脚本：将 Vercel Blob 图片迁移到 GitHub 图床
 * 
 * 处理范围：
 * 1. 宝宝头像 (Baby.avatarUrl)
 * 2. 用户头像 (User.avatarUrl)
 * 3. 相册图片 (BabyAlbum.url)
 * 4. 成长记录图片 (GrowthRecord.imageUrl)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { GitHubUploader, generateAlbumPath, generateFilename } from '../lib/github';

const BLOB_HOSTS = ['vercel-blob.com', 'blob.vercel.com', 'public-user-images-'];

interface MigrationResult {
    table: string;
    success: number;
    failed: number;
    errors: string[];
}

async function migrateSingleImage(
    url: string,
    uploader: GitHubUploader,
    babyName: string = 'system',
    category: string = 'misc'
): Promise<string | null> {
    try {
        // 检查是否已是其他图床
        if (!BLOB_HOSTS.some(host => url.includes(host))) {
            return url; // 非 Blob URL，跳过
        }

        // 下载图片
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        
        // 生成路径
        const date = new Date();
        const folderPath = generateAlbumPath(category as any, babyName, date);
        const ext = getImageExt(url) || 'jpg';
        const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

        // 上传到 GitHub
        const result = await uploader.uploadFile(Buffer.from(buffer), filename, folderPath);

        if (result.success && result.url) {
            console.log(`  ✓ Migrated: ${url.split('/').pop()} -> ${result.url.split('/').pop()}`);
            return result.url;
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error: any) {
        console.error(`  ✗ Failed: ${url}`, error.message);
        return null;
    }
}

function getImageExt(url: string): string {
    const match = url.match(/\.([^.]+)(?:\?|$)/);
    if (match) {
        const ext = match[1].toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
            return ext;
        }
    }
    return 'jpg';
}

async function migrateTable(
    tableName: string,
    records: any[],
    urlField: string,
    getUploader: (record: any) => Promise<GitHubUploader | null>,
    getBabyName: (record: any) => Promise<string>
): Promise<MigrationResult> {
    const result: MigrationResult = {
        table: tableName,
        success: 0,
        failed: 0,
        errors: []
    };

    console.log(`\n📋 Migrating ${tableName}...`);

    for (const record of records) {
        const urls = record[urlField];
        if (!urls) continue;

        const urlList = urls.split(',').map((u: string) => u.trim()).filter(Boolean);
        const newUrls: string[] = [];

        for (const url of urlList) {
            const isBlob = BLOB_HOSTS.some(host => url.includes(host));
            if (!isBlob) {
                newUrls.push(url);
                continue;
            }

            const uploader = await getUploader(record);
            const babyName = await getBabyName(record);

            if (!uploader) {
                console.error(`  ✗ No GitHub config for record ${record.id}`);
                newUrls.push(url);
                result.failed++;
                continue;
            }

            const newUrl = await migrateSingleImage(url, uploader, babyName, tableName);
            if (newUrl) {
                newUrls.push(newUrl);
                result.success++;
            } else {
                newUrls.push(url); // 失败保留原 URL
                result.failed++;
            }
        }

        // 更新记录
        try {
            const updateData: any = { [urlField]: newUrls.join(',') };
            await prisma[tableName as keyof typeof prisma].update({
                where: { id: record.id },
                data: updateData
            });
        } catch (err: any) {
            result.errors.push(`Record ${record.id}: ${err.message}`);
        }
    }

    return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const authKey = req.headers['x-migration-key'];
    const expectedKey = process.env.MIGRATION_SECRET || 'migration-key';
    
    if (authKey !== expectedKey) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('🟢 Starting full image migration...');
    const allResults: MigrationResult[] = [];

    try {
        // 1. 宝宝头像
        const babies = await prisma.baby.findMany({
            where: {
                avatarUrl: { contains: 'vercel-blob' }
            }
        });

        for (const baby of babies) {
            const config = await prisma.gitHubConfig.findUnique({
                where: { userId: baby.userId }
            });
            if (!config?.token) continue;

            const uploader = new GitHubUploader({
                token: config.token,
                owner: config.owner,
                repo: config.repo,
                branch: config.branch || 'main',
                basePath: config.basePath || ''
            });

            const newUrl = await migrateSingleImage(baby.avatarUrl, uploader, baby.name, 'avatar');
            if (newUrl && newUrl !== baby.avatarUrl) {
                await prisma.baby.update({
                    where: { id: baby.id },
                    data: { avatarUrl: newUrl }
                });
                console.log(`  ✓ Baby avatar updated: ${baby.name}`);
            }
        }

        // 2. 用户头像
        const users = await prisma.user.findMany({
            where: {
                avatarUrl: { contains: 'vercel-blob' }
            }
        });

        for (const user of users) {
            const config = await prisma.gitHubConfig.findUnique({
                where: { userId: user.id }
            });
            if (!config?.token) continue;

            const uploader = new GitHubUploader({
                token: config.token,
                owner: config.owner,
                repo: config.repo,
                branch: config.branch || 'main',
                basePath: config.basePath || ''
            });

            const newUrl = await migrateSingleImage(user.avatarUrl, uploader, user.nickname || 'user', 'avatar');
            if (newUrl && newUrl !== user.avatarUrl) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { avatarUrl: newUrl }
                });
                console.log(`  ✓ User avatar updated: ${user.nickname}`);
            }
        }

        // 3. 相册图片
        const albums = await prisma.babyAlbum.findMany({
            where: {
                url: { contains: 'vercel-blob' },
                deletedAt: null
            },
            include: { baby: true }
        });

        for (const album of albums) {
            const config = await prisma.gitHubConfig.findUnique({
                where: { userId: album.userId }
            });
            if (!config?.token) continue;

            const uploader = new GitHubUploader({
                token: config.token,
                owner: config.owner,
                repo: config.repo,
                branch: config.branch || 'main',
                basePath: config.basePath || ''
            });

            const urls = album.url.split(',');
            const newUrls: string[] = [];

            for (const url of urls) {
                if (!BLOB_HOSTS.some(host => url.includes(host))) {
                    newUrls.push(url);
                    continue;
                }

                const newUrl = await migrateSingleImage(url, uploader, album.baby?.name || 'unknown', album.albumType);
                newUrls.push(newUrl || url);
            }

            if (newUrls.join(',') !== album.url) {
                await prisma.babyAlbum.update({
                    where: { id: album.id },
                    data: { url: newUrls.join(',') }
                });
                console.log(`  ✓ Album ${album.id} updated`);
            }
        }

        // 4. 成长记录图片
        const growthRecords = await prisma.growthRecord.findMany({
            where: {
                imageUrl: { contains: 'vercel-blob' }
            },
            include: { baby: true }
        });

        for (const record of growthRecords) {
            const config = await prisma.gitHubConfig.findUnique({
                where: { userId: record.baby?.userId || BigInt(0) }
            });
            if (!config?.token) continue;

            const uploader = new GitHubUploader({
                token: config.token,
                owner: config.owner,
                repo: config.repo,
                branch: config.branch || 'main',
                basePath: config.basePath || ''
            });

            const newUrl = await migrateSingleImage(record.imageUrl, uploader, record.baby?.name || 'unknown', 'growth');
            if (newUrl && newUrl !== record.imageUrl) {
                await prisma.growthRecord.update({
                    where: { id: record.id },
                    data: { imageUrl: newUrl }
                });
                console.log(`  ✓ Growth record ${record.id} image updated`);
            }
        }

        console.log('\n✅ Migration completed!');

        return res.status(200).json({
            message: 'Migration completed successfully',
            migrated: {
                babies: babies.length,
                users: users.length,
                albums: albums.length,
                growthRecords: growthRecords.length
            }
        });

    } catch (error: any) {
        console.error('Migration error:', error);
        return res.status(500).json({
            message: 'Migration failed',
            error: error.message
        });
    }
}
