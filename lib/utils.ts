import { VercelResponse } from '@vercel/node';

/**
 * Safely serialize data with BigInt support and sensitive field filtering
 */
/**
 * 递归替换对象中的 BigInt 为字符串，Decimal 为数字，过滤敏感字段
 * 比 JSON.stringify replacer 更可靠（避免 Node.js 版本差异问题）
 */
const sanitize = (val: any, depth = 0): any => {
    if (depth > 20) return val; // 防止循环引用
    if (val === null || val === undefined) return val;
    if (typeof val === 'bigint') return val.toString();
    // Prisma Decimal
    if (typeof val === 'object' && typeof val.toNumber === 'function') return val.toNumber();
    if (Array.isArray(val)) return val.map(v => sanitize(v, depth + 1));
    if (val instanceof Date) return val;
    if (typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
            if (k === 'password') continue; // 过滤密码
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

/**
 * Unified success response
 */
export const success = (res: VercelResponse, data: any = {}, status = 200) => {
    return res.status(status).json(safeJSON(data));
};

/**
 * Unified error response
 */
export const error = (res: VercelResponse, message: string, status = 400) => {
    return res.status(status).json({ message });
};

/**
 * Common validation helpers
 */
export const validate = {
    email: (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    phone: (val: string) => /^\d{11}$/.test(val),
};
