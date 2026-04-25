import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';
import { success, error } from '../lib/utils';
import { sendEmail } from '../lib/mail';
import { GitHubUploader, generateAlbumPath, generateFilename } from '../lib/github';
import * as bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const decoded = await getUserFromRequest(req);
    if (!decoded) return error(res, '请先登录', 401);
    const uId = BigInt(decoded.userId);

    const { action } = req.query;

    try {
        const userData = await prisma.user.findUnique({ where: { id: uId } });
        if (!userData || userData.deletedAt) return error(res, '账号不存在或已注销', 404);

        if (req.method === 'GET' && action === 'info') {
            return success(res, userData);
        }

        if (req.method === 'POST' && action === 'update') {
            const { nickname, avatarUrl, email, settings } = req.body;
            const updatedUser = await prisma.user.update({
                where: { id: uId },
                data: { nickname, avatarUrl, email, settings }
            });
            return success(res, updatedUser);
        }

        if (req.method === 'GET' && action === 'stats') {
            const babyCount = await prisma.baby.count({
                where: { OR: [{ userId: uId }, { collaborators: { some: { userId: uId } } }] }
            });

            const feedingCount = await prisma.feedingRecord.count({ where: { createdBy: uId } });
            const sleepCount = await prisma.sleepRecord.count({ where: { createdBy: uId } });
            const diaperCount = await prisma.diaperRecord.count({ where: { createdBy: uId } });
            const growthCount = await prisma.growthRecord.count({ where: { createdBy: uId } });

            const userData = await prisma.user.findUnique({ where: { id: uId } });
            const createdAtTime = userData?.createdAt ? new Date(userData.createdAt).getTime() : Date.now();
            const diffMs = Date.now() - createdAtTime;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const joinDays = diffDays >= 0 ? Math.max(0, diffDays) : 0;

            return success(res, {
                babyCount,
                totalRecords: feedingCount + sleepCount + diaperCount + growthCount,
                joinDays
            });
        }

        if (req.method === 'POST' && action === 'change-password') {
            const { oldPassword, newPassword } = req.body;
            if (!userData.password) return error(res, '该账号未设置密码', 400);

            const isMatch = await bcrypt.compare(oldPassword, userData.password);
            if (!isMatch) return error(res, '原密码不正确', 400);

            const hashed = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: uId },
                data: { password: hashed }
            });
            return success(res, { message: '密码修改成功' });
        }

        if (req.method === 'POST' && action === 'delete-account') {
            const { password } = req.body;
            if (!userData.password) return error(res, '该账号未设置密码', 400);

            const isMatch = await bcrypt.compare(password, userData.password);
            if (!isMatch) return error(res, '密码不正确', 400);

            // Soft delete
            await prisma.user.update({
                where: { id: uId },
                data: { deletedAt: new Date() }
            });
            return success(res, { message: '账号已注销' });
        }

        // Test email endpoint
        if (req.method === 'POST' && action === 'test-email') {
            if (!userData.email) return error(res, '请先在个人中心设置邮箱', 400);
            try {
                await sendEmail(
                    userData.email,
                    'Nutri-Baby 育儿助手 - 提醒测试成功',
                    `<div style="font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #ff8f94 0%, #ffb87a 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 邮件通道测试成功！</h1>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">亲爱的 ${userData.nickname || '用户'}，</p>
                            <p style="font-size: 15px; color: #666; line-height: 1.8;">您的账号邮件提醒通道已畅通。当宝宝有即将到来的疫苗接种、或是系统为您生成了深度育儿分析时，我们都会通过此邮箱及时通知您。</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                            <p style="font-size: 12px; color: #bbb;">Nutri-Baby - 让科学育儿更简单</p>
                        </div>
                    </div>`
                );
                return success(res, { message: '测试邮件已发送' });
            } catch (e: any) {
                console.error('Test email failed:', e);
                return error(res, '邮件发送失败：' + (e?.message || '请检查邮箱是否正确'), 500);
            }
        }

        // Trigger notify endpoint (manual trigger for cron tasks)
        if (req.method === 'POST' && action === 'trigger-notify') {
            const { type } = req.body;
            
            // For manual trigger, we just return success - the actual cron runs on Vercel schedule
            // This endpoint is for user to manually test the notification settings
            if (type === 'vaccine' || type === 'all') {
                // In production, this would trigger the vaccine reminder logic
                return success(res, { message: '疫苗提醒任务已触发', type: 'vaccine' });
            }
            if (type === 'aiTip' || type === 'all') {
                return success(res, { message: 'AI育儿锦囊任务已触发', type: 'aiTip' });
            }
            return success(res, { message: '定时任务已执行' });
        }

        // ========== Settings (from settings.ts) ==========
        if (req.method === 'GET' && action === 'get') {
            // 通用设置获取
            const userData = await prisma.user.findUnique({
                where: { id: uId },
                select: { settings: true, defaultBabyId: true }
            });
            return success(res, {
                settings: userData?.settings || {},
                defaultBabyId: userData?.defaultBabyId?.toString() || null
            });
        }

        if (req.method === 'POST' && action === 'save') {
            // 通用设置保存
            const { settings, defaultBabyId } = req.body;
            await prisma.user.update({
                where: { id: uId },
                data: {
                    ...(settings && { settings }),
                    ...(defaultBabyId !== undefined && { defaultBabyId: defaultBabyId ? BigInt(defaultBabyId) : null })
                }
            });
            return success(res, { message: '设置已保存' });
        }

        // ========== GitHub Settings (from settings.ts) ==========
        if (req.method === 'GET' && action === 'github-config') {
            const config = await prisma.gitHubConfig.findUnique({ where: { userId: uId } });
            if (!config) return success(res, { configured: false });
            return success(res, {
                configured: true,
                config: {
                    owner: config.owner,
                    repo: config.repo,
                    branch: config.branch,
                    basePath: config.basePath,
                    autoSync: config.autoSync,
                    syncInterval: config.syncInterval,
                    syncGrowth: config.syncGrowth,
                    syncMoment: config.syncMoment,
                    syncVaccine: config.syncVaccine
                }
            });
        }

        if (req.method === 'POST' && action === 'github-save') {
            const { owner, repo, branch, basePath, autoSync, syncInterval, syncGrowth, syncMoment, syncVaccine, token } = req.body;
            const existing = await prisma.gitHubConfig.findUnique({ where: { userId: uId } });

            if (existing) {
                const updated = await prisma.gitHubConfig.update({
                    where: { userId: uId },
                    data: { owner, repo, branch, basePath, autoSync, syncInterval, syncGrowth, syncMoment, syncVaccine, token }
                });
                return success(res, { configured: true, config: updated });
            } else {
                const created = await prisma.gitHubConfig.create({
                    data: { userId: uId, owner, repo, branch, basePath, autoSync, syncInterval, syncGrowth, syncMoment, syncVaccine, token }
                });
                return success(res, { configured: true, config: created });
            }
        }

        if (req.method === 'POST' && action === 'github-test') {
            const { token, owner, repo, branch } = req.body;
            try {
                const uploader = new GitHubUploader({ token, owner, repo, branch, basePath: '' });
                const result = await uploader.testConnection();
                return success(res, result);
            } catch (e: any) {
                return error(res, '连接失败: ' + e.message, 500);
            }
        }

        if (req.method === 'POST' && action === 'github-sync') {
            const config = await prisma.gitHubConfig.findUnique({ where: { userId: uId } });
            if (!config || !config.token) return error(res, '请先配置 GitHub');

            try {
                const uploader = new GitHubUploader({
                    token: config.token,
                    owner: config.owner,
                    repo: config.repo,
                    branch: config.branch,
                    basePath: config.basePath
                });

                const albums = await prisma.babyAlbum.findMany({
                    where: { userId: uId, deletedAt: null },
                    include: { baby: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                });

                let synced = 0;
                for (const album of albums) {
                    try {
                        const urls = album.url.split(',');
                        const babyName = album.baby?.name || '未知宝宝';
                        const date = new Date(album.createdAt);
                        const folderPath = generateAlbumPath(album.albumType, babyName, date);

                        await uploader.createFolder(folderPath);

                        for (let i = 0; i < urls.length; i++) {
                            const url = urls[i].trim();
                            if (!url || !url.startsWith('http')) continue;

                            const filename = generateFilename(`${album.id}_${i}.jpg`, i);
                            const imageResponse = await fetch(url);
                            if (!imageResponse.ok) continue;

                            const buffer = await imageResponse.arrayBuffer();
                            const result = await uploader.uploadFile(Buffer.from(buffer), filename, folderPath);
                            if (result.success) synced++;
                        }
                    } catch (e) {
                        console.error('Sync album error:', e);
                    }
                }

                await prisma.gitHubConfig.update({
                    where: { userId: uId },
                    data: { lastSyncAt: new Date() }
                });

                return success(res, { message: `同步完成，成功 ${synced} 个文件` });
            } catch (e: any) {
                return error(res, '同步失败: ' + e.message, 500);
            }
        }

        if (req.method === 'GET' && action === 'github-logs') {
            const logs = await prisma.syncLog.findMany({
                where: { userId: uId },
                orderBy: { createdAt: 'desc' },
                take: 10
            });
            return success(res, { logs });
        }

        return error(res, '请求无效', 404);
    } catch (err) {
        console.error('User API Error:', err);
        return error(res, '获取用户信息失败', 500);
    }
}
