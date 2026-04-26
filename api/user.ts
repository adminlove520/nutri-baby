import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest } from '../lib/auth';
import { success, error } from '../lib/utils';
import { sendEmail } from '../lib/mail';
import { sendNotification, sendDailyTipNotification, sendVaccineReminderNotification, sendAIAnalysisNotification } from '../lib/notification';
import { GitHubUploader, generateAlbumPath, generateFilename } from '../lib/github';
import { AIFactory } from '../lib/ai/factory';
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

        // ========== Manual Trigger Notifications ==========
        if (req.method === 'POST' && action === 'trigger-notify') {
            const { type, babyId } = req.body;
            const userData = await prisma.user.findUnique({ where: { id: uId } });
            if (!userData) return error(res, 'User not found', 404);
            
            const settings = (userData.settings as any) || {};
            const results: any = {};
            
            try {
                // 1. 手动触发疫苗提醒
                if (type === 'vaccine' || type === 'all') {
                    // 获取用户的宝宝
                    const babies = await prisma.baby.findMany({
                        where: { OR: [{ userId: uId }, { collaborators: { some: { userId: uId } }] },
                        include: { collaborators: true }
                    });
                    
                    for (const baby of babies) {
                        // 获取明天要接种的疫苗
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(0, 0, 0, 0);
                        const tomorrowEnd = new Date(tomorrow);
                        tomorrowEnd.setHours(23, 59, 59, 999);
                        
                        const tomorrowVaccines = await prisma.babyVaccineSchedule.findMany({
                            where: {
                                babyId: baby.id,
                                scheduledDate: { gte: tomorrow, lte: tomorrowEnd },
                                vaccinationStatus: 'pending'
                            }
                        });
                        
                        if (tomorrowVaccines.length > 0) {
                            for (const v of tomorrowVaccines) {
                                await sendVaccineReminderNotification(
                                    uId,
                                    baby.name,
                                    v.vaccineName,
                                    v.scheduledDate.toISOString().split('T')[0]
                                );
                            }
                            results.vaccine = { sent: true, count: tomorrowVaccines.length, vaccines: tomorrowVaccines.map(v => v.vaccineName) };
                        } else {
                            results.vaccine = { sent: false, message: '明天没有待接种的疫苗' };
                        }
                    }
                }
                
                // 2. 手动触发每日锦囊
                if (type === 'aiTip' || type === 'all') {
                    // 获取宝宝信息
                    let baby: any = null;
                    if (babyId) {
                        baby = await prisma.baby.findUnique({ where: { id: BigInt(babyId) } });
                    } else {
                        const babies = await prisma.baby.findMany({
                            where: { OR: [{ userId: uId }, { collaborators: { some: { userId: uId } }] },
                            orderBy: { createdAt: 'asc' },
                            take: 1
                        });
                        baby = babies[0] || null;
                    }
                    
                    const babyAgeMonth = baby 
                        ? Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000)
                        : 0;
                    
                    // 调用 AI 生成锦囊
                    const provider = AIFactory.createProvider();
                    const aiResponse = await provider.analyze({
                        babyProfile: baby ? {
                            name: baby.name,
                            birthDate: baby.birthDate,
                            gender: baby.gender,
                            month: babyAgeMonth,
                            ageStr: babyAgeMonth >= 1 ? `${babyAgeMonth}个月` : '新生儿'
                        } : undefined,
                        recentRecords: { feeding: [], sleep: [], growth: [] },
                        query: '请为' + (baby ? `${babyAgeMonth}个月大的${baby.name}` : '新生儿') + '的家长提供一条科学、实用的每日育儿建议。请用JSON格式返回：{"title": "建议标题（15字内）", "content": "建议详细正文（100-200字，纯文本）", "category": "建议类别"}'
                    });
                    
                    let tipData = { title: '每日育儿锦囊', content: aiResponse.insight || '暂无建议', category: '日常护理' };
                    
                    // 尝试解析 JSON
                    try {
                        let cleanJson = aiResponse.insight.trim();
                        if (cleanJson.startsWith('```')) {
                            const match = cleanJson.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
                            if (match && match[1]) cleanJson = match[1].trim();
                        }
                        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            if (parsed.title && (parsed.content || parsed.description)) {
                                tipData = {
                                    title: parsed.title,
                                    content: parsed.content || parsed.description,
                                    category: parsed.category || '日常护理'
                                };
                            }
                        }
                    } catch {}
                    
                    // 发送通知
                    await sendDailyTipNotification(uId, tipData.title, tipData.content, tipData.category);
                    results.aiTip = { sent: true, title: tipData.title };
                }
                
                // 3. 手动触发 AI 健康分析
                if (type === 'aiAnalysis' || type === 'all') {
                    // 获取宝宝信息
                    let baby: any = null;
                    if (babyId) {
                        baby = await prisma.baby.findUnique({ where: { id: BigInt(babyId) } });
                    } else {
                        const babies = await prisma.baby.findMany({
                            where: { OR: [{ userId: uId }, { collaborators: { some: { userId: uId } }] },
                            orderBy: { createdAt: 'asc' },
                            take: 1
                        });
                        baby = babies[0] || null;
                    }
                    
                    if (!baby) {
                        results.aiAnalysis = { sent: false, message: '请先添加宝宝信息' };
                    } else {
                        const babyAgeMonth = Math.floor((new Date().getTime() - new Date(baby.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000));
                        
                        // 获取最近7天的数据
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        
                        const [feeding, sleep, growth] = await Promise.all([
                            prisma.feedingRecord.findMany({ where: { babyId: baby.id, time: { gte: sevenDaysAgo } }, take: 20 }),
                            prisma.sleepRecord.findMany({ where: { babyId: baby.id, startTime: { gte: sevenDaysAgo } }, take: 20 }),
                            prisma.growthRecord.findMany({ where: { babyId: baby.id, time: { gte: sevenDaysAgo } }, take: 5 })
                        ]);
                        
                        // 调用 AI 分析
                        const provider = AIFactory.createProvider();
                        const aiResponse = await provider.analyze({
                            babyProfile: {
                                name: baby.name,
                                birthDate: baby.birthDate,
                                gender: baby.gender,
                                month: babyAgeMonth,
                                ageStr: babyAgeMonth >= 1 ? `${babyAgeMonth}个月` : '新生儿'
                            },
                            recentRecords: {
                                feeding: feeding.map(f => ({ type: f.feedingType, amount: f.amount, time: f.time })),
                                sleep: sleep.map(s => ({ duration: s.duration, startTime: s.startTime })),
                                growth: growth.map(g => ({ height: g.height, weight: g.weight }))
                            },
                            query: '请分析宝宝最近的喂养、睡眠和生长发育情况，给出专业的健康建议和注意事项。'
                        });
                        
                        // 发送 AI 分析通知
                        await sendAIAnalysisNotification(
                            uId,
                            'AI 健康分析报告',
                            aiResponse.insight || '暂无分析结果',
                            baby.name
                        );
                        results.aiAnalysis = { sent: true, baby: baby.name };
                    }
                }
                
                return success(res, { 
                    message: '通知已发送，请检查站内信和邮箱',
                    results,
                    email: userData.email || '未配置邮箱'
                });
            } catch (err: any) {
                console.error('[trigger-notify] Error:', err);
                return error(res, `发送失败: ${err.message}`, 500);
            }
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
                    syncVaccine: config.syncVaccine,
                    lastSyncAt: config.lastSyncAt
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

                const BLOB_HOSTS = ['vercel-blob.com', 'blob.vercel.com', 'public-user-images-'];
                const needsSync = (url: string): boolean => {
                    if (!url) return false;
                    const lower = url.toLowerCase();
                    const isBlob = BLOB_HOSTS.some(h => lower.includes(h));
                    const isGitHub = lower.includes('raw.githubusercontent.com') || lower.includes('github.com');
                    return isBlob && !isGitHub;
                };

                let synced = 0;

                // 1. 同步宝宝头像
                const babies = await prisma.baby.findMany({ where: { userId: uId } });
                for (const baby of babies) {
                    if (baby.avatarUrl && needsSync(baby.avatarUrl)) {
                        try {
                            const folderPath = `Photos/${baby.name}/头像`;
                            await uploader.createFolder(folderPath);
                            const filename = `avatar_${baby.id}.jpg`;
                            const resp = await fetch(baby.avatarUrl);
                            if (resp.ok) {
                                const buf = await resp.arrayBuffer();
                                const result = await uploader.uploadFile(Buffer.from(buf), filename, folderPath);
                                if (result.success) {
                                    await prisma.baby.update({
                                        where: { id: baby.id },
                                        data: { avatarUrl: result.url }
                                    });
                                    synced++;
                                }
                            }
                        } catch (e) { console.error('Baby avatar sync error:', e); }
                    }
                }

                // 2. 同步相册图片
                const albums = await prisma.babyAlbum.findMany({
                    where: { userId: uId, deletedAt: null },
                    include: { baby: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 50
                });

                for (const album of albums) {
                    try {
                        const urls = album.url.split(',');
                        const babyName = album.baby?.name || '未知宝宝';
                        const date = new Date(album.createdAt);
                        const folderPath = generateAlbumPath(album.albumType, babyName, date);
                        await uploader.createFolder(folderPath);

                        for (let i = 0; i < urls.length; i++) {
                            const url = urls[i].trim();
                            if (!url || !url.startsWith('http') || !needsSync(url)) continue;

                            try {
                                const filename = `photo_${album.id}_${i}.jpg`;
                                const resp = await fetch(url);
                                if (resp.ok) {
                                    const buf = await resp.arrayBuffer();
                                    const result = await uploader.uploadFile(Buffer.from(buf), filename, folderPath);
                                    if (result.success) synced++;
                                }
                            } catch (e) { console.error('Album sync error:', e); }
                        }
                    } catch (e) { console.error('Album sync error:', e); }
                }

                // 3. 同步成长记录图片
                const growthRecords = await prisma.growthRecord.findMany({
                    where: { baby: { userId: uId }, imageUrl: { not: null } },
                    include: { baby: { select: { name: true } } },
                    take: 50
                });

                for (const record of growthRecords) {
                    if (record.imageUrl && needsSync(record.imageUrl)) {
                        try {
                            const babyName = record.baby?.name || '未知宝宝';
                            const date = new Date(record.recordedAt || record.createdAt);
                            const folderPath = generateAlbumPath('growth', babyName, date);
                            await uploader.createFolder(folderPath);
                            const filename = `growth_${record.id}.jpg`;
                            const resp = await fetch(record.imageUrl);
                            if (resp.ok) {
                                const buf = await resp.arrayBuffer();
                                const result = await uploader.uploadFile(Buffer.from(buf), filename, folderPath);
                                if (result.success) {
                                    await prisma.growthRecord.update({
                                        where: { id: record.id },
                                        data: { imageUrl: result.url }
                                    });
                                    synced++;
                                }
                            }
                        } catch (e) { console.error('Growth sync error:', e); }
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
