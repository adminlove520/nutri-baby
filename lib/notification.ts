import prisma from './prisma';
import { sendEmail } from './mail';

/**
 * 通知类型枚举
 */
export type NotificationType = 'tips' | 'vaccine' | 'system' | 'ai_analysis' | 'ai';

/**
 * 通知数据接口
 */
interface NotificationData {
    userId: bigint;
    title: string;
    content: string;
    type: NotificationType;
}

/**
 * 发送通知的配置
 */
interface SendNotificationOptions {
    /** 用户ID */
    userId: bigint;
    /** 通知标题 */
    title: string;
    /** 通知内容 */
    content: string;
    /** 通知类型 */
    type: NotificationType;
    /** 用户设置（可选，用于检查是否启用通知） */
    userSettings?: Record<string, any>;
    /** 是否发送邮件（默认true） */
    sendEmail?: boolean;
    /** 邮件HTML内容（可选，不提供则使用默认模板） */
    emailHtml?: string;
}

/**
 * 获取用户通知设置
 */
async function getUserSettings(userId: bigint): Promise<Record<string, any>> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true }
    });
    return (user?.settings as Record<string, any>) || {};
}

/**
 * 检查是否应该发送站内信
 */
function shouldSendInAppNotification(type: NotificationType, settings: Record<string, any>): boolean {
    switch (type) {
        case 'tips':
            return settings.aiTipsNotify !== false; // 默认 true
        case 'vaccine':
            return settings.vaccineNotify !== false; // 默认 true
        case 'ai_analysis':
        case 'ai':
            return settings.aiAnalysisNotify !== false; // 默认 true
        case 'system':
            return true; // 系统通知总是发送
        default:
            return true;
    }
}

/**
 * 检查是否应该发送邮件
 */
function shouldSendEmail(type: NotificationType, settings: Record<string, any>): boolean {
    // 需要先检查 emailNotify 是否启用
    if (settings.emailNotify === false) return false;
    
    switch (type) {
        case 'tips':
            return settings.aiTipsNotify !== false;
        case 'vaccine':
            return settings.vaccineNotify !== false;
        case 'ai_analysis':
        case 'ai':
            return settings.aiAnalysisNotify !== false;
        case 'system':
            return settings.systemNotify !== false;
        default:
            return true;
    }
}

/**
 * 生成默认邮件HTML模板
 */
function getDefaultEmailHtml(title: string, content: string, type: NotificationType): string {
    const icon = type === 'tips' ? '✨' : type === 'vaccine' ? '💉' : type === 'ai_analysis' ? '🤖' : '📢';
    const subtitle = type === 'tips' ? '每日育儿锦囊' : type === 'vaccine' ? '疫苗接种提醒' : type === 'ai_analysis' ? 'AI 健康分析' : '系统通知';
    
    return `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fbfc;">
            <div style="background-color: #fff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255,142,148,0.1); border: 1px solid #ffeaec;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #ff8e94; margin: 0; font-size: 28px; font-weight: 900;">Nutri-Baby</h1>
                    <p style="color: #a4b0be; font-size: 14px; margin-top: 5px;">${icon} ${subtitle}</p>
                </div>
                <div style="border-left: 4px solid #ff8e94; padding-left: 20px; margin-bottom: 30px;">
                    <h2 style="color: #2c3e50; margin: 0 0 10px; font-size: 20px;">${title}</h2>
                    <p style="color: #57606f; font-size: 16px; line-height: 1.6; margin: 0;">${content}</p>
                </div>
                <div style="text-align: center; border-top: 1px solid #f1f2f6; padding-top: 30px;">
                    <p style="font-size: 12px; color: #a4b0be; margin: 0;">此邮件由系统自动发送，请勿直接回复。</p>
                    <p style="font-size: 12px; color: #a4b0be; margin: 5px 0 0;">© 2026 Nutri-Baby Project. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * 发送单一用户通知（站内信 + 邮件）
 */
export async function sendNotification(options: SendNotificationOptions): Promise<{ inApp: boolean; email: boolean }> {
    const { userId, title, content, type, sendEmail: shouldEmail = true } = options;
    
    const settings = options.userSettings || await getUserSettings(userId);
    let inAppSent = false;
    let emailSent = false;
    
    // 1. 发送站内信
    if (shouldSendInAppNotification(type, settings)) {
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    title,
                    content,
                    type
                }
            });
            inAppSent = true;
        } catch (err) {
            console.error(`[Notification] Failed to create in-app notification for user ${userId}:`, err);
        }
    }
    
    // 2. 发送邮件
    if (shouldEmail) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });
        
        if (user?.email && shouldSendEmail(type, settings)) {
            try {
                const emailHtml = options.emailHtml || getDefaultEmailHtml(title, content, type);
                await sendEmail(user.email, `${type === 'tips' ? '✨' : type === 'vaccine' ? '💉' : '🤖'} ${title}`, emailHtml);
                emailSent = true;
            } catch (err) {
                console.error(`[Notification] Failed to send email to user ${userId} (${user.email}):`, err);
            }
        }
    }
    
    return { inApp: inAppSent, email: emailSent };
}

/**
 * 批量发送通知（站内信 + 邮件）
 */
export async function sendNotificationsBulk(
    notifications: NotificationData[],
    sendEmailFlag: boolean = true
): Promise<{ success: number; failed: number; emailSuccess: number; emailFailed: number }> {
    let success = 0;
    let failed = 0;
    let emailSuccess = 0;
    let emailFailed = 0;
    
    for (const notif of notifications) {
        try {
            await prisma.notification.create({
                data: {
                    userId: notif.userId,
                    title: notif.title,
                    content: notif.content,
                    type: notif.type
                }
            });
            success++;
        } catch (err) {
            console.error(`[Notification] Bulk: Failed to create notification:`, err);
            failed++;
        }
    }
    
    // 邮件批量发送
    if (sendEmailFlag) {
        const userIds = [...new Set(notifications.map(n => n.userId.toString()))];
        
        for (const userIdStr of userIds) {
            const userId = BigInt(userIdStr);
            const settings = await getUserSettings(userId);
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true }
            });
            
            if (!user?.email) continue;
            
            // 获取该用户的所有通知，合并成一封邮件
            const userNotifs = notifications.filter(n => n.userId === userId);
            const title = `Nutri-Baby ${userNotifs.length} 条新通知`;
            const content = userNotifs.map(n => `• ${n.title}`).join('\n');
            
            if (shouldSendEmail(userNotifs[0].type, settings)) {
                try {
                    const emailHtml = `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fbfc;">
                            <div style="background-color: #fff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255,142,148,0.1); border: 1px solid #ffeaec;">
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <h1 style="color: #ff8e94; margin: 0; font-size: 28px; font-weight: 900;">Nutri-Baby</h1>
                                    <p style="color: #a4b0be; font-size: 14px; margin-top: 5px;">📢 您有 ${userNotifs.length} 条新通知</p>
                                </div>
                                <div style="border-left: 4px solid #ff8e94; padding-left: 20px; margin-bottom: 30px;">
                                    ${userNotifs.map(n => `
                                        <div style="margin-bottom: 16px;">
                                            <h3 style="color: #2c3e50; margin: 0 0 8px; font-size: 16px;">${n.title}</h3>
                                            <p style="color: #57606f; font-size: 14px; line-height: 1.5; margin: 0;">${n.content}</p>
                                        </div>
                                    `).join('<hr style="border: none; border-top: 1px solid #f1f2f6; margin: 16px 0;">')}
                                </div>
                                <div style="text-align: center; border-top: 1px solid #f1f2f6; padding-top: 30px;">
                                    <p style="font-size: 12px; color: #a4b0be; margin: 0;">此邮件由系统自动发送，请勿直接回复。</p>
                                    <p style="font-size: 12px; color: #a4b0be; margin: 5px 0 0;">© 2026 Nutri-Baby Project. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    await sendEmail(user.email, title, emailHtml);
                    emailSuccess++;
                } catch (err) {
                    console.error(`[Notification] Bulk email failed for user ${userId}:`, err);
                    emailFailed++;
                }
            }
        }
    }
    
    return { success, failed, emailSuccess, emailFailed };
}

/**
 * 发送每日锦囊通知
 */
export async function sendDailyTipNotification(
    userId: bigint,
    title: string,
    content: string,
    category?: string
): Promise<{ inApp: boolean; email: boolean }> {
    return sendNotification({
        userId,
        title: `✨ ${title}`,
        content,
        type: 'tips',
        emailHtml: getDefaultEmailHtml(title, content, 'tips')
    });
}

/**
 * 发送疫苗提醒通知
 */
export async function sendVaccineReminderNotification(
    userId: bigint,
    babyName: string,
    vaccineName: string,
    scheduledDate: string
): Promise<{ inApp: boolean; email: boolean }> {
    const title = `疫苗接种提醒: ${vaccineName}`;
    const content = `您的宝宝 ${babyName} 预计将在 ${scheduledDate} 接种 ${vaccineName}。请提前做好准备。`;
    
    const emailHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fbfc;">
            <div style="background-color: #fff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(255,142,148,0.1); border: 1px solid #ffeaec;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #ff8e94; margin: 0; font-size: 28px; font-weight: 900;">Nutri-Baby</h1>
                    <p style="color: #a4b0be; font-size: 14px; margin-top: 5px;">💉 宝宝接种贴心提醒</p>
                </div>
                <div style="border-left: 4px solid #ff8e94; padding-left: 20px; margin-bottom: 30px;">
                    <h2 style="color: #2c3e50; margin: 0 0 10px; font-size: 20px;">${title}</h2>
                    <p style="color: #57606f; font-size: 16px; line-height: 1.6; margin: 0;">您的宝宝 <b>${babyName}</b> 预计将在 <b>${scheduledDate}</b> 进行 <b>${vaccineName}</b> 接种。请记得提前查看接种证，做好宝宝护理准备。</p>
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
    `;
    
    return sendNotification({
        userId,
        title,
        content,
        type: 'vaccine',
        emailHtml
    });
}

/**
 * 发送 AI 分析通知
 */
export async function sendAIAnalysisNotification(
    userId: bigint,
    title: string,
    content: string,
    babyName?: string
): Promise<{ inApp: boolean; email: boolean }> {
    return sendNotification({
        userId,
        title: babyName ? `🤖 AI 健康分析（${babyName}）` : `🤖 AI 健康分析`,
        content,
        type: 'ai_analysis',
        emailHtml: getDefaultEmailHtml(title, content, 'ai_analysis')
    });
}
