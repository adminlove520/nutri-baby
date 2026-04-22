import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getUserFromRequest, hasBabyPermission } from '../lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const safeJSON = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    const uId = BigInt(user.userId);

    const { action, babyId } = req.query;

    // --- CRUD Actions ---
    if (!action) {
        if (req.method === 'GET') {
            const babies = await prisma.baby.findMany({
                where: { OR: [{ userId: uId }, { collaborators: { some: { userId: uId } } }] },
                include: { collaborators: true }
            });
            return res.status(200).json(safeJSON(babies));
        }

        if (req.method === 'POST') {
            const { name, nickname, gender, birthDate, avatarUrl } = req.body;
            const baby = await prisma.baby.create({
                data: { name, nickname, gender: gender || 'male', birthDate: new Date(birthDate), avatarUrl, userId: uId }
            });
            return res.status(201).json(safeJSON(baby));
        }

        if (req.method === 'PUT' && babyId) {
            const bId = BigInt(babyId as string);
            if (!(await hasBabyPermission(uId, bId))) return res.status(403).json({ message: 'Forbidden' });
            const { name, nickname, gender, birthDate, avatarUrl } = req.body;
            const updated = await prisma.baby.update({
                where: { id: bId },
                data: { name, nickname, gender, birthDate: birthDate ? new Date(birthDate) : undefined, avatarUrl }
            });
            return res.status(200).json(safeJSON(updated));
        }

        if (req.method === 'DELETE' && babyId) {
            const bId = BigInt(babyId as string);
            // Only owner can delete? Let's assume yes for now
            const baby = await prisma.baby.findUnique({ where: { id: bId } });
            if (!baby || baby.userId !== uId) return res.status(403).json({ message: 'Forbidden' });
            await prisma.baby.delete({ where: { id: bId } });
            return res.status(204).end();
        }
    }

    // --- Specialized Actions ---
    if (action === 'vaccines') {
        if (!babyId) return res.status(400).json({ message: 'Baby ID required' });
        const bId = BigInt(babyId as string);
        if (!(await hasBabyPermission(uId, bId))) return res.status(403).json({ message: 'Forbidden' });

        if (req.method === 'GET') {
            let schedules = await prisma.babyVaccineSchedule.findMany({ where: { babyId: bId }, orderBy: { scheduledDate: 'asc' } });
            if (schedules.length === 0) {
                const baby = await prisma.baby.findUnique({ where: { id: bId } });
                const templates = await prisma.vaccinePlanTemplate.findMany({ orderBy: { ageInMonths: 'asc' } });
                if (baby && templates.length > 0) {
                    const newSchedules = templates.map(t => {
                        const scheduledDate = new Date(baby.birthDate);
                        scheduledDate.setMonth(scheduledDate.getMonth() + t.ageInMonths);
                        return { babyId: bId, templateId: t.id, vaccineType: t.vaccineType, vaccineName: t.vaccineName, description: t.description, ageInMonths: t.ageInMonths, doseNumber: t.doseNumber, isRequired: t.isRequired, scheduledDate, createdBy: uId };
                    });
                    await prisma.babyVaccineSchedule.createMany({ data: newSchedules });
                    schedules = await prisma.babyVaccineSchedule.findMany({ where: { babyId: bId }, orderBy: { scheduledDate: 'asc' } });
                }
            }
            return res.status(200).json(safeJSON(schedules));
        }
        if (req.method === 'POST') {
            const { id, status, vaccineDate, hospital, note } = req.body;
            const result = await prisma.babyVaccineSchedule.update({
                where: { id: BigInt(id) },
                data: { vaccinationStatus: status || 'completed', vaccineDate: vaccineDate ? new Date(vaccineDate) : new Date(), hospital, note, completedBy: uId, completedTime: new Date() }
            });
            return res.status(200).json(safeJSON(result));
        }
    }

    // Action: Invite
    if (action === 'invite') {
        if (!babyId) return res.status(400).json({ message: 'Baby ID required' });
        const bId = BigInt(babyId as string);
        if (!(await hasBabyPermission(uId, bId))) return res.status(403).json({ message: 'Forbidden' });
        const token = jwt.sign({ babyId: bId.toString(), inviterId: uId.toString(), type: 'invite' }, JWT_SECRET, { expiresIn: '24h' });
        return res.status(200).json({ token });
    }

    // Action: Join
    if (action === 'join') {
        const { token, role } = req.body;
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            if (decoded.type !== 'invite') return res.status(400).json({ message: 'Invalid token' });
            const bId = BigInt(decoded.babyId);
            const exists = await prisma.babyCollaborator.findFirst({ where: { babyId: bId, userId: uId } });
            if (exists) return res.status(400).json({ message: 'Already a collaborator' });
            await prisma.babyCollaborator.create({ data: { babyId: bId, userId: uId, role: role || 'Member' } });
            return res.status(200).json({ message: 'Joined successfully' });
        } catch (e) {
            return res.status(400).json({ message: 'Token expired or invalid' });
        }
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
}
