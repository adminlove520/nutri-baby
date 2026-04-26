import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { sendEmail } from '../lib/mail';
import { getUserFromRequest } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';
import { success, error, getBeijingDate, toBeijingTime } from '../lib/utils';
import { GitHubUploader, generateAlbumPath, generateFilename } from '../lib/github';

async function syncUserAlbumsToGitHub(userId: number): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    const config = await prisma.gitHubConfig.findUnique({ where: { userId } });

    if (!config || !config.autoSync) {
        return { success: false, syncedCount: 0, errors: ['GitHub 同步未启用'] };
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
        return { success: false, syncedCount: 0, errors: ['GitHub 连接失败: ' + connectionTest.message] };
    }

    const BLOB_HOSTS = ['vercel-blob.com', 'blob.vercel.com', 'public-user-images-'];
    
    // 判断URL是否需要同步（是Vercel Blob且不在GitHub上）
    const needsSync = (url: string): boolean => {
        if (!url) return false;
        const lower = url.toLowerCase();
        // 如果包含Vercel Blob域名，且不是GitHub链接 -> 需要同步
        const isBlob = BLOB_HOSTS.some(h => lower.includes(h));
        const isGitHub = lower.includes('raw.githubusercontent.com') || lower.includes('github.com');
        return isBlob && !isGitHub;
    };

    // 通用同步单个图片
    const syncImage = async (url: string, folderPath: string, filename: string): Promise<boolean> => {
        try {
            const filePath = `${folderPath}/${filename}`;
            
            // 跳过空URL或非HTTP链接
            if (!url || !url.startsWith('http')) return false;
            
            // 如果不是Blob链接，跳过（已经在其他地方了）
            if (!needsSync(url)) return false;
            
            // 检查是否已经存在于GitHub
            if (await uploader.checkFileExists(filePath)) {
                console.log(`[Sync] Skip (already exists): ${filePath}`);
                return false;
            }

            // 下载图片
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`[Sync] Failed to fetch: ${url}`);
                return false;
            }

            const buffer = await response.arrayBuffer();
            const result = await uploader.uploadFile(Buffer.from(buffer), filename, folderPath);
            
            if (result.success) {
                console.log(`[Sync] Success: ${url} -> ${result.url}`);
                return true;
            }
            return false;
        } catch (e: any) {
            console.error(`[Sync] Error syncing ${url}:`, e.message);
            return false;
        }
    };

    let syncedCount = 0;
    const errors: string[] = [];

    // 1. 同步宝宝头像
    try {
        const babies = await prisma.baby.findMany({ where: { userId } });
        for (const baby of babies) {
            if (baby.avatarUrl && needsSync(baby.avatarUrl)) {
                const filename = `avatar_${baby.id}.jpg`;
                const folderPath = `Photos/${baby.name}/头像`;
                await uploader.createFolder(folderPath);
                if (await syncImage(baby.avatarUrl, folderPath, filename)) {
                    await prisma.baby.update({
                        where: { id: baby.id },
                        data: { avatarUrl: `${config.owner}/${config.repo}/main/${folderPath}/${filename}` }
                    });
                    syncedCount++;
                }
            }
        }
    } catch (e: any) {
        errors.push(`同步宝宝头像失败: ${e.message}`);
    }

    // 2. 同步用户头像
    try {
        const user = await prisma.user.findUnique({ where: { id: BigInt(userId) } });
        if (user?.avatarUrl && needsSync(user.avatarUrl)) {
            const filename = `avatar_${userId}.jpg`;
            const folderPath = `Photos/用户头像`;
            await uploader.createFolder(folderPath);
            if (await syncImage(user.avatarUrl, folderPath, filename)) {
                await prisma.user.update({
                    where: { id: BigInt(userId) },
                    data: { avatarUrl: `${config.owner}/${config.repo}/main/${folderPath}/${filename}` }
                });
                syncedCount++;
            }
        }
    } catch (e: any) {
        errors.push(`同步用户头像失败: ${e.message}`);
    }

    // 3. 同步相册图片
    const albumTypeFilter = config.syncVaccine
        ? undefined
        : {
            in: config.syncGrowth
                ? (config.syncMoment ? ['growth', 'moment'] : ['growth'])
                : (config.syncMoment ? ['moment'] : [])
        };

    const albums = await prisma.babyAlbum.findMany({
        where: {
            userId,
            deletedAt: null,
            albumType: albumTypeFilter
        },
        include: { baby: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100
    });

    for (const album of albums) {
        try {
            const urls = album.url.split(',');
            const babyName = album.baby?.name || '未知宝宝';
            const date = new Date(album.createdAt);
            const baseFolderPath = generateAlbumPath(album.albumType, babyName, date);

            await uploader.createFolder(baseFolderPath);

            for (let i = 0; i < urls.length; i++) {
                const url = urls[i].trim();
                if (await syncImage(url, baseFolderPath, `photo_${i}.jpg`)) {
                    syncedCount++;
                }
            }
        } catch (e: any) {
            errors.push(`相册 ${album.id} 同步错误: ${e.message}`);
        }
    }

    // 4. 同步成长记录图片
    try {
        const growthRecords = await prisma.growthRecord.findMany({
            where: {
                baby: { userId },
                imageUrl: { not: null }
            },
            include: { baby: { select: { name: true } } },
            take: 50
        });

        for (const record of growthRecords) {
            if (record.imageUrl && needsSync(record.imageUrl)) {
                const babyName = record.baby?.name || '未知宝宝';
                const date = new Date(record.recordedAt || record.createdAt);
                const folderPath = generateAlbumPath('growth', babyName, date);
                await uploader.createFolder(folderPath);
                
                if (await syncImage(record.imageUrl, folderPath, `growth_${record.id}.jpg`)) {
                    await prisma.growthRecord.update({
                        where: { id: record.id },
                        data: { imageUrl: `${config.owner}/${config.repo}/main/${folderPath}/growth_${record.id}.jpg` }
                    });
                    syncedCount++;
                }
            }
        }
    } catch (e: any) {
        errors.push(`同步成长记录失败: ${e.message}`);
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

    return { success: true, syncedCount, errors };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Basic secret check for cron jobs
    if (req.headers['x-cron-auth'] !== process.env.CRON_SECRET && !req.query.testEmail && !req.query.triggerAiTip) {
        // return res.status(401).json({ message: 'Unauthorized' });
    }

    // 1. Test Email Logic
    if (req.query.testEmail === 'true') {
        const decoded = await getUserFromRequest(req);
        if (!decoded) return res.status(401).json({ message: 'Unauthorized' });

        const user = await prisma.user.findUnique({ where: { id: BigInt(decoded.userId) } });
        if (!user || !user.email) {
            return res.status(400).json({ message: 'User email not found in database' });
        }

        try {
            await sendEmail(
                user.email,
                'Nutri-Baby 育儿助手 - 提醒测试成功',
                `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #ff8e94;">🎉 提醒邮件通道测试成功！</h2>
                    <p>亲爱的家长，这是一封来自 <b>Nutri-Baby</b> 的 system 测试邮件。</p>
                    <p>目前您的账号邮件提醒通道已畅通。当您的宝宝有即将到来的疫苗接种、或是系统为您生成了深度育儿分析时，我们都会通过此邮箱及时通知您。</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">本邮件由系统自动发出，请勿直接回复。</p>
                </div>
                `
            );
            return res.status(200).json({ message: 'Test email sent successfully' });
        } catch (err: any) {
            console.error('Test Email Failed:', err);
            return res.status(500).json({ message: 'Failed to send test email', error: err.message });
        }
    }

    // 2. Daily AI Tip Generation (Triggered by Cron or Manual)
    if (req.query.triggerAiTip === 'true' || req.headers['x-cron-auth'] === process.env.CRON_SECRET) {
        try {
            const provider = AIFactory.createProvider();
            const aiResponse = await provider.analyze({
                babyProfile: { name: '宝宝', gender: 'unknown', birthDate: new Date(), month: 0 },
                recentRecords: { feeding: [], sleep: [], growth: [] },
                query: "请生成一条通用的、科学的、温馨的每日育儿锦囊（包含标题和正文）。内容应涵盖营养、睡眠、心理或日常护理中的一个方面。请以JSON格式返回，不要包含Markdown代码块：{ \"title\": \"...\", \"content\": \"...\", \"category\": \"...\" }"
            });

            if (!aiResponse || !aiResponse.insight) {
                throw new Error('AI Provider returned empty response');
            }

            let tipData = { title: '每日育儿锦囊', content: aiResponse.insight, category: '日常护理' };
            try {
                // Try to parse if AI returned JSON as requested
                let cleanJson = aiResponse.insight.trim();
                if (cleanJson.startsWith('```')) {
                    const match = cleanJson.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
                    if (match && match[1]) {
                        cleanJson = match[1].trim();
                    }
                }
                
                const parsed = JSON.parse(cleanJson);
                if (parsed.title && (parsed.content || parsed.description)) {
                    tipData = {
                        title: parsed.title,
                        content: parsed.content || parsed.description,
                        category: parsed.category || '日常护理'
                    };
                }
            } catch (e) {
                // Fallback to raw insight if not JSON
            }

            // Get all users who enabled AI tips
            const users = await prisma.user.findMany({
                where: { deletedAt: null }
            });

            const notificationsData = users
                .filter(u => {
                    const settings = (u.settings as any) || {};
                    return settings.aiTipsNotify !== false; // Default true
                })
                .map(u => ({
                    userId: u.id,
                    title: `✨ ${tipData.title}`,
                    content: tipData.content,
                    type: 'tips'
                }));

            if (notificationsData.length > 0) {
                await prisma.notification.createMany({ data: notificationsData });
            }

            // Also add to ExpertTip table for display on Home page
            await prisma.expertTip.create({
                data: {
                    title: tipData.title,
                    content: tipData.content,
                    category: tipData.category || '每日推荐',
                    minAgeMonth: 0,
                    maxAgeMonth: 36,
                    source: 'AI Daily'
                }
            });
            
            if (req.query.triggerAiTip) {
                return success(res, { message: 'AI Tips pushed', count: notificationsData.length, tip: tipData });
            }
        } catch (err: any) {
            console.error('AI Tip Generation Error:', err);
            if (req.query.triggerAiTip) return res.status(500).json({ 
                message: 'AI Tip Generation Failed', 
                error: err.message,
                details: err.toString()
            });
        }
    }

    // 使用北京时间计算明天的日期范围
    const todayBeijing = getBeijingDate();
    todayBeijing.setHours(0, 0, 0, 0);
    
    // 明天的北京凌晨 0 点 = UTC 今天下午 4 点
    const tomorrowBeijing = new Date(todayBeijing);
    tomorrowBeijing.setDate(todayBeijing.getDate() + 1);
    
    // 转为 UTC 存储格式查询
    const reminderTarget = toBeijingTime(tomorrowBeijing);
    const reminderEnd = new Date(reminderTarget.getTime() + 24 * 60 * 60 * 1000 - 1);
    reminderEnd.setHours(23, 59, 59, 999);

    try {
        const upcomingVaccines = await prisma.babyVaccineSchedule.findMany({
            where: {
                scheduledDate: {
                    gte: reminderTarget,
                    lte: reminderEnd
                },
                vaccinationStatus: 'pending',
                reminderSent: false
            },
            include: {
                baby: {
                    include: {
                        user: true,
                        collaborators: {
                            include: {
                                user: true
                            }
                        }
                    }
                }
            }
        });

        const notifications: { userId: any; title: string; content: string; type: string }[] = [];
        for (const v of upcomingVaccines) {
            const primaryUser = v.baby.user;
            const primarySettings = (primaryUser.settings as any) || {};

            const title = `疫苗接种提醒: ${v.vaccineName}`;
            const content = `您的宝宝 ${v.baby.name} 预计将在 ${v.scheduledDate.toISOString().split('T')[0]} 接种 ${v.vaccineName}。请提前做好准备。`;
            
            // 1. Create Internal Notification for primary user
            if (primarySettings.vaccineNotify !== false) {
                notifications.push({
                    userId: v.baby.userId,
                    title,
                    content,
                    type: 'vaccine'
                });
            }

            // 2. Create for collaborators
            for (const c of v.baby.collaborators) {
                const cSettings = (c.user.settings as any) || {};
                if (cSettings.vaccineNotify !== false) {
                    notifications.push({
                        userId: c.userId,
                        title,
                        content,
                        type: 'vaccine'
                    });
                }
            }

            // 3. Real Email Push for primary user
            if (primaryUser.email && primarySettings.emailNotify !== false) {
                try {
                    await sendEmail(primaryUser.email, title, `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fbfc;">
                            <div style="background-color: #fff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255,142,148,0.1); border: 1px solid #ffeaec;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <h1 style="color: #ff8e94; margin: 0; font-size: 28px; font-weight: 900;">Nutri-Baby</h1>
                                    <p style="color: #a4b0be; font-size: 14px; margin-top: 5px;">宝宝接种贴心提醒</p>
                                </div>
                                <div style="border-left: 4px solid #ff8e94; padding-left: 20px; margin-bottom: 30px;">
                                    <h2 style="color: #2c3e50; margin: 0 0 10px; font-size: 20px;">${title}</h2>
                                    <p style="color: #57606f; font-size: 16px; line-height: 1.6; margin: 0;">您的宝宝 <b>${v.baby.name}</b> 预计将在 <b>${v.scheduledDate.toISOString().split('T')[0]}</b> 进行 <b>${v.vaccineName}</b> 接种。请记得提前查看接种证，做好宝宝护理准备。</p>
                                </div>
                                <div style="background-color: #fff9f9; padding: 20px; border-radius: 16px; margin-bottom: 30px;">
                                    <p style="margin: 0; font-size: 14px; color: #ff8e94; font-weight: 700;">💡 温馨提示：</p>
                                    <p style="margin: 8px 0 0; font-size: 13px; color: #57606f; line-height: 1.5;">接种当天请确保宝宝身体状况良好，无发热、严重腹泻等症状。接种后请在现场留观 30 分钟。</p>
                                </div>
                                <div style="text-align: center; border-top: 1px solid #f1f2f6; padding-top: 30px;">
                                    <p style="font-size: 12px; color: #a4b0be; margin: 0;">此邮件由系统自动发送，请勿直接回复。</p>
                                    <p style="font-size: 12px; color: #a4b0be; margin: 5px 0 0;">© 2026 Nutri-Baby Project. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    `);
                } catch (err) {
                    console.error('Failed to send email to', primaryUser.email, err);
                }
            }

            // Update reminder sent status
            await prisma.babyVaccineSchedule.update({
                where: { id: v.id },
                data: { reminderSent: true, reminderSentAt: new Date() }
            });
        }

        if (notifications.length > 0) {
            await prisma.notification.createMany({
                data: notifications
            });
        }

        const usersWithGitHubSync = await prisma.gitHubConfig.findMany({
            where: { autoSync: true }
        });

        for (const gConfig of usersWithGitHubSync) {
            const lastSync = gConfig.lastSyncAt ? new Date(gConfig.lastSyncAt) : null;
            const shouldSync = !lastSync ||
                (gConfig.syncInterval === 'daily' && (Date.now() - lastSync.getTime()) > 24 * 60 * 60 * 1000) ||
                (gConfig.syncInterval === 'weekly' && (Date.now() - lastSync.getTime()) > 7 * 24 * 60 * 60 * 1000) ||
                (gConfig.syncInterval === 'monthly' && (Date.now() - lastSync.getTime()) > 30 * 24 * 60 * 60 * 1000);

            if (shouldSync) {
                try {
                    await syncUserAlbumsToGitHub(gConfig.userId);
                } catch (e) {
                    console.error(`GitHub sync failed for user ${gConfig.userId}:`, e);
                }
            }
        }

        return res.status(200).json({ processed: upcomingVaccines.length });
    } catch (error) {
        console.error('Cron Reminder Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
