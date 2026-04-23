import { VercelResponse } from '@vercel/node';

/**
 * Safely serialize data with BigInt support and sensitive field filtering
 */
export const safeJSON = (data: any) => {
    try {
        return JSON.parse(JSON.stringify(data, (key, value) => {
            if (typeof value === 'bigint') return value.toString();
            if (key === 'password') return undefined;
            // Handle Prisma Decimal objects (they have toNumber/toString methods)
            if (value !== null && typeof value === 'object' && typeof value.toNumber === 'function') {
                return value.toNumber();
            }
            return value;
        }));
    } catch (e) {
        console.error('Serialization Error:', e);
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
