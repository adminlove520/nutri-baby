import { VercelRequest } from '@vercel/node';
import jwt from 'jsonwebtoken';
import prisma from './prisma';

// JWT_SECRET 必须设置，不允许 fallback
if (!process.env.JWT_SECRET) {
    console.error('[Auth] FATAL: JWT_SECRET environment variable is not set!');
}
const JWT_SECRET = process.env.JWT_SECRET || 'INSECURE-FALLBACK-ONLY-FOR-DEVELOPMENT';

interface DecodedToken {
    userId: string;
    openid: string;
    iat: number;
    exp: number;
}

export async function getUserFromRequest(req: VercelRequest) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('[Auth] No valid Bearer token in headers');
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET!) as DecodedToken;
        return {
            ...decoded,
            id: parseInt(decoded.userId)
        };
    } catch (error: any) {
        console.error('[Auth] JWT verification failed:', error.message);
        if (error.message === 'invalid signature') {
            console.error('[Auth] Secret key mismatch. Check JWT_SECRET environment variable.');
        }
        return null;
    }
}

export async function hasBabyPermission(userId: string | bigint, babyId: string | bigint) {
    const uId = BigInt(userId);
    const bId = BigInt(babyId);

    const baby = await prisma.baby.findFirst({
        where: {
            id: bId,
            OR: [
                { userId: uId },
                { collaborators: { some: { userId: uId } } }
            ]
        }
    });

    return !!baby;
}
