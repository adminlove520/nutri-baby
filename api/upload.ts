import { put } from '@vercel/blob';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../lib/auth';
import { GitHubUploader, generateAlbumPath, generateFilename } from '../lib/github';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { filename } = req.query;
    const { action } = req.query;

    // GitHub 图床上传
    if (action === 'github') {
        try {
            // 获取用户的 GitHub 配置
            const { default: prisma } = await import('../lib/prisma');
            const config = await prisma.gitHubConfig.findUnique({
                where: { userId: BigInt(user.userId) }
            });

            if (!config || !config.token || !config.owner || !config.repo) {
                return res.status(400).json({
                    message: 'GitHub 图床未配置，请在设置中配置 GitHub 图床',
                    code: 'GITHUB_NOT_CONFIGURED'
                });
            }

            let { filename: fileName, data, babyId, albumType } = req.body;

            if (!fileName || !data) {
                return res.status(400).json({ message: '缺少文件名或图片数据' });
            }

            // 验证 base64 数据格式
            const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
            let imageBuffer: Buffer;

            try {
                imageBuffer = Buffer.from(base64Data, 'base64');
            } catch (e) {
                return res.status(400).json({ message: '无效的图片数据' });
            }

            // 获取宝宝名称
            let babyName = '未知宝宝';
            if (babyId) {
                const baby = await prisma.baby.findUnique({ where: { id: BigInt(babyId) } });
                if (baby) babyName = baby.name;
            }

            const date = new Date();
            const baseFolderPath = albumType
                ? generateAlbumPath(albumType, babyName, date)
                : `uploads/${babyName}`;

            const finalFilename = generateFilename(fileName, 0);

            const uploader = new GitHubUploader({
                token: config.token,
                owner: config.owner,
                repo: config.repo,
                branch: config.branch || 'main',
                basePath: config.basePath || 'Photos'  // 默认 Photos，可自定义
            });

            const result = await uploader.uploadFile(imageBuffer, finalFilename, baseFolderPath);

            if (result.success && result.url) {
                return res.status(200).json({
                    url: result.url,
                    path: result.path,
                    message: '上传成功'
                });
            } else {
                return res.status(500).json({
                    message: result.error || '上传失败'
                });
            }
        } catch (err: any) {
            console.error('[GitHub Upload Error]:', err);
            return res.status(500).json({
                message: `上传失败: ${err.message}`
            });
        }
    }

    // Vercel Blob 上传（原有逻辑）
    if (!filename) return res.status(400).json({ message: 'Filename required' });

    try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.error('Missing BLOB_READ_WRITE_TOKEN environment variable');
            return res.status(500).json({
                message: 'Vercel Blob Storage not configured.'
            });
        }

        const body = (req as any).body || req;

        const blob = await put(filename as string, body, {
            access: 'public',
        });

        return res.status(200).json(blob);
    } catch (error: any) {
        console.error('Upload Error Details:', error);
        return res.status(500).json({
            message: `Upload Failed: ${error.message || 'Unknown Error'}`
        });
    }
}
