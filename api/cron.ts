import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { sendEmail } from '../lib/mail';
import { getUserFromRequest } from '../lib/auth';
import { AIFactory } from '../lib/ai/factory';

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
                    <p>亲爱的家长，这是一封来自 <b>Nutri-Baby</b> 的系统测试邮件。</p>
                    <p>目前您的账号邮件提醒通道已畅通。当您的宝宝有即将到来的疫苗接种、或是系统为您生成了深度育儿分析时，我们都会通过此邮箱及时通知您。</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #999;">本邮件由系统自动发出，请勿直接回复。</p>
                </div>
                `
            );
            return res.status(200).json({ message: 'Test email sent successfully' });
        } catch (err) {
            console.error('Test Email Failed:', err);
            return res.status(500).json({ message: 'Failed to send test email' });
        }
    }

    // 2. Daily AI Tip Generation (Triggered by Cron or Manual)
    if (req.query.triggerAiTip === 'true' || req.headers['x-cron-auth'] === process.env.CRON_SECRET) {
        try {
            const provider = AIFactory.createProvider();
            const aiResponse = await provider.analyze({
                babyProfile: { name: '宝宝', gender: 'unknown', birthDate: new Date() },
                recentRecords: { feeding: [], sleep: [], growth: [] },
                query: "请生成一条通用的、科学的、温馨的每日育儿锦囊（包含标题和正文）。内容应涵盖营养、睡眠、心理或日常护理中的一个方面。请以JSON格式返回，不要包含Markdown代码块：{ \"title\": \"...\", \"content\": \"...\", \"category\": \"...\" }"
            });

            let tipData = { title: '每日育儿锦囊', content: aiResponse.insight, category: '日常护理' };
            try {
                // Try to parse if AI returned JSON as requested
                const cleanJson = aiResponse.insight.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson);
                if (parsed.title && parsed.content) tipData = parsed;
            } catch (e) {
                // Fallback to raw insight if not JSON
            }

            // Get all users who enabled AI tips
            const users = await prisma.user.findMany({
                where: { deletedAt: null }
            });

            const notifications = users
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

            if (notifications.length > 0) {
                await prisma.notification.createMany({ data: notifications });
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
                return res.status(200).json({ message: 'AI Tips pushed', count: notifications.length, tip: tipData });
            }
        } catch (err) {
            console.error('AI Tip Generation Error:', err);
            if (req.query.triggerAiTip) return res.status(500).json({ message: 'AI Tip Generation Failed' });
        }
    }

    const today = new Date();
    const reminderTarget = new Date();
    reminderTarget.setDate(today.getDate() + 3); // 3 days in advance

    try {
        const upcomingVaccines = await prisma.babyVaccineSchedule.findMany({
            where: {
                scheduledDate: {
                    lte: reminderTarget,
                    gte: today
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

        const notifications = [];
        for (const v of upcomingVaccines) {
            const title = `疫苗接种提醒: ${v.vaccineName}`;
            const content = `您的宝宝 ${v.baby.name} 预计将在 ${v.scheduledDate.toISOString().split('T')[0]} 接种 ${v.vaccineName}。请提前做好准备。`;
            
            // Create for primary user
            notifications.push({
                userId: v.baby.userId,
                title,
                content,
                type: 'vaccine'
            });

            // Create for collaborators
            v.baby.collaborators.forEach(c => {
                notifications.push({
                    userId: c.userId,
                    title,
                    content,
                    type: 'vaccine'
                });
            });

            // Update reminder sent status
            await prisma.babyVaccineSchedule.update({
                where: { id: v.id },
                data: { reminderSent: true, reminderSentAt: new Date() }
            });

            // Real Email Push
            if (v.baby.user.email) {
                try {
                    await sendEmail(v.baby.user.email, title, `
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
                    console.error('Failed to send email to', v.baby.user.email, err);
                }
            }
        }

        if (notifications.length > 0) {
            await prisma.notification.createMany({
                data: notifications
            });
        }

        return res.status(200).json({ processed: upcomingVaccines.length });
    } catch (error) {
        console.error('Cron Reminder Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
