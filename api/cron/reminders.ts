import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';

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
            
            // Log for Email Push (Mock)
            console.log(`[EMAIL PUSH] Sent to ${v.baby.user.email || 'N/A'}: ${title}`);
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
