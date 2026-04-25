import { VercelResponse } from '@vercel/node';

/**
 * 北京时间（UTC+8）工具函数
 * 所有时间存储在数据库为 UTC，输出显示用北京时间
 */
const BEIJING_OFFSET_HOURS = 8;

export const toBeijingTime = (date: Date): Date => {
    return new Date(date.getTime() + BEIJING_OFFSET_HOURS * 60 * 60 * 1000);
};

export const getBeijingDate = (): Date => {
    const now = new Date();
    return new Date(now.getTime() + BEIJING_OFFSET_HOURS * 60 * 60 * 1000);
};

export const formatBeijingDate = (date: Date): string => {
    const beijing = toBeijingTime(date);
    return `${beijing.getFullYear()}-${String(beijing.getMonth() + 1).padStart(2, '0')}-${String(beijing.getDate()).padStart(2, '0')}`;
};

export const getBeijingDateOnly = (): { start: Date; end: Date } => {
    const beijing = getBeijingDate();
    beijing.setHours(0, 0, 0, 0);
    const start = new Date(beijing.getTime() - BEIJING_OFFSET_HOURS * 60 * 60 * 1000);
    const end = new Date(beijing.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start, end };
};

/**
 * Safely serialize data with BigInt support and sensitive field filtering
 */
const sanitize = (val: any, depth = 0): any => {
    if (depth > 20) return val;
    if (val === null || val === undefined) return val;
    if (typeof val === 'bigint') return val.toString();
    if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber();
    if (Array.isArray(val)) return val.map(v => sanitize(v, depth + 1));
    if (val instanceof Date) return val;
    if (typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
            if (k === 'password') continue;
            out[k] = sanitize(v, depth + 1);
        }
        return out;
    }
    return val;
};

export const safeJSON = (data: any) => {
    try {
        return sanitize(data);
    } catch (e) {
        console.error('[safeJSON] Serialization Error:', e);
        return { error: 'Serialization Failed' };
    }
};

export const success = (res: VercelResponse, data: any = {}, status = 200) => {
    return res.status(status).json(safeJSON(data));
};

export const error = (res: VercelResponse, message: string, status = 400) => {
    return res.status(status).json({ message });
};

export const validate = {
    email: (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    phone: (val: string) => /^\d{11}$/.test(val),
};
