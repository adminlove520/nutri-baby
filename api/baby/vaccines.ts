import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../../lib/auth';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { babyId } = req.query;
    if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

    const bId = BigInt(babyId as string);
    const uId = BigInt(user.userId);

    if (!(await hasBabyPermission(uId, bId))) {
        return res.status(403).json({ message: 'Forbidden' });
    }

    if (req.method === 'GET') {
        try {
            let schedules = await prisma.babyVaccineSchedule.findMany({
                where: { babyId: bId },
                orderBy: { scheduledDate: 'asc' }
            });

            // If no schedule, generate from templates
            if (schedules.length === 0) {
                const baby = await prisma.baby.findUnique({ where: { id: bId } });
                if (!baby) return res.status(404).json({ message: 'Baby not found' });

                const templates = await prisma.vaccinePlanTemplate.findMany({
                    orderBy: { sortOrder: 'asc' }
                });

                if (templates.length > 0) {
                    const newSchedules = templates.map(t => {
                        const scheduledDate = new Date(baby.birthday);
                        scheduledDate.setMonth(scheduledDate.getMonth() + t.ageInMonths);
                        
                        return {
                            babyId: bId,
                            templateId: t.id,
                            vaccineType: t.vaccineType,
                            vaccineName: t.vaccineName,
                            description: t.description,
                            ageInMonths: t.ageInMonths,
                            doseNumber: t.doseNumber,
                            isRequired: t.isRequired,
                            reminderDays: t.reminderDays,
                            scheduledDate,
                            createdBy: uId
                        };
                    });

                    await prisma.babyVaccineSchedule.createMany({
                        data: newSchedules
                    });

                    schedules = await prisma.babyVaccineSchedule.findMany({
                        where: { babyId: bId },
                        orderBy: { scheduledDate: 'asc' }
                    });
                }
            }

            return res.status(200).json(safeJSON(schedules));
        } catch (error) {
            console.error('Vaccine API GET Error:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    if (req.method === 'POST') {
        const { id, status, vaccineDate, hospital, note } = req.body;
        if (!id) return res.status(400).json({ message: 'Schedule ID required' });

        try {
            const result = await prisma.babyVaccineSchedule.update({
                where: { id: BigInt(id) },
                data: {
                    vaccinationStatus: status || 'completed',
                    vaccineDate: vaccineDate ? new Date(vaccineDate) : new Date(),
                    hospital,
                    note,
                    completedBy: uId,
                    completedTime: new Date()
                }
            });
            return res.status(200).json(safeJSON(result));
        } catch (error) {
            console.error('Vaccine API POST Error:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
