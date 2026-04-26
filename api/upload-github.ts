import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';
import { GitHubUploader, generateAlbumPath, generateFilename } from '../lib/github';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // 获取用户的 GitHub 配置
        const config = await prisma.gitHubConfig.findUnique({
            where: { userId: BigInt(user.userId) }
        });

        if (!config || !config.token || !config.owner || !config.repo) {
            return res.status(400).json({
                message: 'GitHub 图床未配置，请在设置中配置 GitHub 图床',
                code: 'GITHUB_NOT_CONFIGURED'
            });
        }

        // 从请求体获取文件名和 base64 数据
        let { filename, data, babyId, albumType } = req.body;

        if (!filename || !data) {
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

        // 生成文件路径
        const uId = BigInt(user.userId);
        const bId = babyId ? BigInt(babyId) : null;

        // 获取宝宝名称
        let babyName = '未知宝宝';
        if (bId) {
            const baby = await prisma.baby.findUnique({ where: { id: bId } });
            if (baby) babyName = baby.name;
        }

        const date = new Date();
        const baseFolderPath = albumType
            ? generateAlbumPath(albumType, babyName, date)
            : `uploads/${babyName}`;

        const finalFilename = generateFilename(filename, 0);

        // 上传到 GitHub
        const uploader = new GitHubUploader({
            token: config.token,
            owner: config.owner,
            repo: config.repo,
            branch: config.branch || 'main',
            basePath: config.basePath || ''
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
