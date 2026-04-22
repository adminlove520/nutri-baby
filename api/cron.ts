import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { sendEmail } from '../lib/mail';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Basic secret check for cron jobs
    if (req.headers['x-cron-auth'] !== process.env.CRON_SECRET) {
        // In local/dev we might skip this or use a default
        // return res.status(401).json({ message: 'Unauthorized' });
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
                        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #ff8e94;">${title}</h2>
                            <p>${content}</p>
                            <hr />
                            <p style="font-size: 12px; color: #999;">此邮件由 Nutri-Baby 系统自动发送，请勿直接回复。</p>
                        </div>
                    `);
                } catch (err) {
                    console.error('Failed to send email to', v.baby.user.email, err);
                }
            }
            
            console.log(`[PUSH DONE] ${title}`);
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
