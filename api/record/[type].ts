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

    const rawType = req.query.type;
    const type = Array.isArray(rawType) ? rawType[0] : rawType;

    if (!type) return res.status(400).json({ message: 'Record type unspecified' });

    try {
        if (req.method === 'GET') {
            const { babyId, limit = '50' } = req.query;
            if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

            const bId = BigInt(babyId as string);
            if (!(await hasBabyPermission(user.userId, bId))) return res.status(403).json({ message: 'Forbidden' });

            const take = parseInt(limit as string);

            let records = [];
            if (type === 'feeding') {
                records = await prisma.feedingRecord.findMany({ where: { babyId: bId }, orderBy: { time: 'desc' }, take });
            } else if (type === 'sleep') {
                records = await prisma.sleepRecord.findMany({ where: { babyId: bId }, orderBy: { startTime: 'desc' }, take });
            } else if (type === 'diaper') {
                records = await prisma.diaperRecord.findMany({ where: { babyId: bId }, orderBy: { time: 'desc' }, take });
            } else if (type === 'growth') {
                records = await prisma.growthRecord.findMany({ where: { babyId: bId }, orderBy: { time: 'desc' }, take });
            }

            return res.status(200).json({ records: safeJSON(records) });

        } else if (req.method === 'POST') {
            const { babyId, time, ...rest } = req.body;
            if (!babyId) return res.status(400).json({ message: 'Baby ID required' });

            const bId = BigInt(babyId);
            if (!(await hasBabyPermission(user.userId, bId))) return res.status(403).json({ message: 'Forbidden' });

            const uId = BigInt(user.userId);
            const recordTime = new Date(time || new Date());

            let result;
            if (type === 'feeding') {
                const { feedingType, amount, duration, leftBreastMinutes, rightBreastMinutes, foodName, remark } = rest;
                result = await prisma.feedingRecord.create({
                    data: {
                        babyId: bId,
                        time: recordTime,
                        feedingType: feedingType || 'breast',
                        amount: amount ? parseInt(amount) : null,
                        duration: duration ? parseInt(duration) : null,
                        detail: { leftBreastMinutes, rightBreastMinutes, foodName, remark },
                        createdBy: uId
                    }
                });
            } else if (type === 'sleep') {
                const { startTime, endTime, duration, type: sleepType, remark } = rest;
                result = await prisma.sleepRecord.create({
                    data: {
                        babyId: bId,
                        startTime: new Date(startTime || recordTime),
                        endTime: endTime ? new Date(endTime) : null,
                        duration: duration ? parseInt(duration) : null,
                        type: sleepType,
                        createdBy: uId
                    }
                });
            } else if (type === 'diaper') {
                const { type: diaperType, poopColor, poopTexture, remark, note } = rest;
                result = await prisma.diaperRecord.create({
                    data: {
                        babyId: bId,
                        time: recordTime,
                        type: diaperType || 'pee',
                        poopColor,
                        poopTexture,
                        note: note || remark,
                        createdBy: uId
                    }
                });
            } else if (type === 'growth') {
                const { height, weight, headCircumference, remark, note } = rest;
                result = await prisma.growthRecord.create({
                    data: {
                        babyId: bId,
                        time: recordTime,
                        height: height ? parseFloat(height) : null,
                        weight: weight ? parseFloat(weight) : null,
                        headCircumference: headCircumference ? parseFloat(headCircumference) : null,
                        note: note || remark,
                        createdBy: uId
                    }
                });
            }

            return res.status(201).json(safeJSON(result));
        }

        return res.status(405).json({ message: 'Method Not Allowed' });
    } catch (error) {
        console.error(`Record API Error (${type}):`, error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
