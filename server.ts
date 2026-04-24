import http from 'http';
import { parse } from 'url';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from './lib/auth';
import { AIFactory } from './lib/ai/factory';
import { success, error } from './lib/utils';

const prisma = new PrismaClient();

const API_HANDLERS: Record<string, Record<string, (req: http.IncomingMessage, res: http.ServerResponse, userId?: number) => Promise<void>>> = {};

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const parsedUrl = parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';
    const method = req.method || 'GET';

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (pathname === '/api/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId: number | undefined;

    if (token) {
        try {
            const jwt = await import('jsonwebtoken');
            const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
            const decoded = jwt.default.verify(token, JWT_SECRET) as any;
            userId = parseInt(decoded.userId);
        } catch (e) {
            // Token 无效，继续但不设置 userId
        }
    }

    try {
        if (pathname === '/api/auth/login' && method === 'POST') {
            return handleAuthLogin(req, res);
        }

        if (pathname === '/api/auth/register' && method === 'POST') {
            return handleAuthRegister(req, res);
        }

        if (!userId && pathname !== '/api/auth/login' && pathname !== '/api/auth/register') {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }

        if (pathname.startsWith('/api/baby')) {
            return handleBaby(req, res, userId!);
        }

        if (pathname.startsWith('/api/record')) {
            return handleRecord(req, res, userId!);
        }

        if (pathname.startsWith('/api/album')) {
            return handleAlbum(req, res, userId!);
        }

        if (pathname.startsWith('/api/ai')) {
            return handleAI(req, res, userId!);
        }

        if (pathname.startsWith('/api/statistics')) {
            return handleStatistics(req, res, userId!);
        }

        if (pathname.startsWith('/api/notifications')) {
            return handleNotifications(req, res, userId!);
        }

        if (pathname.startsWith('/api/settings')) {
            return handleSettings(req, res, userId!);
        }

        if (pathname.startsWith('/api/timeline')) {
            return handleTimeline(req, res, userId!);
        }

        if (pathname.startsWith('/api/user')) {
            return handleUser(req, res, userId!);
        }

        if (pathname.startsWith('/api/upload')) {
            return handleUpload(req, res, userId!);
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (err: any) {
        console.error('Handler error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
}

async function parseBody<T>(req: http.IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

function sendSuccess(res: http.ServerResponse, data: any, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function sendError(res: http.ServerResponse, message: string, status = 400) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
}

async function handleAuthLogin(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await parseBody<{ phone: string; password: string }>(req);
    const bcrypt = await import('bcryptjs');
    const jwt = await import('jsonwebtoken');

    const user = await prisma.user.findUnique({
        where: { phone: body.phone },
        include: { babies: true }
    });

    if (!user || !(await bcrypt.compare(body.password, user.password || ''))) {
        return sendError(res, '手机号或密码错误', 401);
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.default.sign({ userId: user.id.toString() }, JWT_SECRET, { expiresIn: '7d' });

    sendSuccess(res, {
        token,
        user: {
            id: user.id.toString(),
            phone: user.phone,
            nickname: user.nickname,
            babies: user.babies
        }
    });
}

async function handleAuthRegister(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await parseBody<{ phone: string; password: string; nickname?: string }>(req);
    const bcrypt = await import('bcryptjs');
    const jwt = await import('jsonwebtoken');

    const existing = await prisma.user.findUnique({ where: { phone: body.phone } });
    if (existing) {
        return sendError(res, '该手机号已注册', 400);
    }

    const hashed = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
        data: {
            phone: body.phone,
            password: hashed,
            nickname: body.nickname || '用户'
        }
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.default.sign({ userId: user.id.toString() }, JWT_SECRET, { expiresIn: '7d' });

    sendSuccess(res, { token, user: { id: user.id.toString(), phone: user.phone, nickname: user.nickname } });
}

async function handleBaby(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const pathname = parse(req.url || '/', true).pathname || '/';
    const method = req.method || 'GET';

    if (method === 'GET' && pathname === '/api/baby') {
        const babies = await prisma.baby.findMany({
            where: { userId: BigInt(userId), deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        return sendSuccess(res, { babies });
    }

    if (method === 'POST' && pathname === '/api/baby') {
        const body = await parseBody<any>(req);
        const baby = await prisma.baby.create({
            data: {
                name: body.name,
                birthDate: new Date(body.birthDate),
                gender: body.gender,
                userId: BigInt(userId)
            }
        });
        return sendSuccess(res, baby, 201);
    }

    const match = pathname.match(/^\/api\/baby\/(\d+)$/);
    if (match) {
        const babyId = parseInt(match[1]);

        if (method === 'GET') {
            const baby = await prisma.baby.findFirst({
                where: { id: BigInt(babyId), deletedAt: null }
            });
            return sendSuccess(res, baby);
        }

        if (method === 'PUT') {
            const body = await parseBody<any>(req);
            const baby = await prisma.baby.update({
                where: { id: BigInt(babyId) },
                data: body
            });
            return sendSuccess(res, baby);
        }

        if (method === 'DELETE') {
            await prisma.baby.update({
                where: { id: BigInt(babyId) },
                data: { deletedAt: new Date() }
            });
            return sendSuccess(res, { message: 'Deleted' });
        }
    }

    sendError(res, 'Not Found', 404);
}

async function handleRecord(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const parsedUrl = parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';
    const method = req.method || 'GET';
    const type = parsedUrl.query.type as string;

    if (!type) return sendError(res, 'Missing type parameter');

    const babyId = parsedUrl.query.babyId ? parseInt(parsedUrl.query.babyId as string) : undefined;

    if (method === 'GET') {
        const where: any = { deletedAt: null };
        if (babyId) where.babyId = BigInt(babyId);

        let records: any[] = [];
        switch (type) {
            case 'feeding':
                records = await prisma.feedingRecord.findMany({
                    where,
                    orderBy: { time: 'desc' },
                    take: 100
                });
                break;
            case 'sleep':
                records = await prisma.sleepRecord.findMany({
                    where,
                    orderBy: { startTime: 'desc' },
                    take: 100
                });
                break;
            case 'diaper':
                records = await prisma.diaperRecord.findMany({
                    where,
                    orderBy: { time: 'desc' },
                    take: 100
                });
                break;
            case 'growth':
                records = await prisma.growthRecord.findMany({
                    where,
                    orderBy: { time: 'desc' },
                    take: 100
                });
                break;
            default:
                return sendError(res, 'Invalid type');
        }
        return sendSuccess(res, { records });
    }

    if (method === 'POST') {
        const body = await parseBody<any>(req);

        switch (type) {
            case 'feeding':
                return sendSuccess(res, await prisma.feedingRecord.create({
                    data: { ...body, createdBy: BigInt(userId) }
                }), 201);
            case 'sleep':
                return sendSuccess(res, await prisma.sleepRecord.create({
                    data: { ...body, createdBy: BigInt(userId) }
                }), 201);
            case 'diaper':
                return sendSuccess(res, await prisma.diaperRecord.create({
                    data: { ...body, createdBy: BigInt(userId) }
                }), 201);
            case 'growth':
                return sendSuccess(res, await prisma.growthRecord.create({
                    data: { ...body, createdBy: BigInt(userId) }
                }), 201);
            default:
                return sendError(res, 'Invalid type');
        }
    }

    sendError(res, 'Method Not Allowed', 405);
}

async function handleAlbum(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const parsedUrl = parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';
    const method = req.method || 'GET';
    const action = parsedUrl.query.action as string;

    if (method === 'GET' && !action) {
        const where: any = { userId: BigInt(userId), deletedAt: null };
        if (parsedUrl.query.babyId) where.babyId = BigInt(parsedUrl.query.babyId as string);

        const records = await prisma.babyAlbum.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return sendSuccess(res, { records });
    }

    if (method === 'POST' && action === 'comment') {
        const body = await parseBody<any>(req);
        const comment = await prisma.albumComment.create({
            data: {
                albumId: BigInt(body.albumId),
                userId: BigInt(userId),
                content: body.content,
                parentId: body.parentId ? BigInt(body.parentId) : null
            }
        });
        return sendSuccess(res, comment, 201);
    }

    if (method === 'POST' && action === 'like') {
        const body = await parseBody<any>(req);
        const existing = await prisma.albumLike.findFirst({
            where: { albumId: BigInt(body.albumId), userId: BigInt(userId) }
        });
        if (existing) return sendSuccess(res, { liked: true });

        await prisma.albumLike.create({
            data: { albumId: BigInt(body.albumId), userId: BigInt(userId) }
        });
        return sendSuccess(res, { liked: true });
    }

    if (method === 'POST' && action === 'share') {
        const body = await parseBody<any>(req);
        const album = await prisma.babyAlbum.findFirst({
            where: { id: BigInt(body.albumId), deletedAt: null },
            include: { baby: true, user: true }
        });
        if (!album) return sendError(res, 'Album not found', 404);

        const shareToken = Buffer.from(`${album.id}-${Date.now()}`).toString('base64url');
        return sendSuccess(res, {
            shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost'}/share/${shareToken}`,
            shareToken
        });
    }

    if (method === 'POST') {
        const body = await parseBody<any>(req);
        const album = await prisma.babyAlbum.create({
            data: {
                ...body,
                userId: BigInt(userId)
            }
        });
        return sendSuccess(res, album, 201);
    }

    sendError(res, 'Method Not Allowed', 405);
}

async function handleAI(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const parsedUrl = parse(req.url || '/', true);
    const action = parsedUrl.query.action as string;
    const method = req.method || 'GET';

    if (method === 'GET' && action === 'tips') {
        const babyId = parsedUrl.query.babyId ? parseInt(parsedUrl.query.babyId as string) : undefined;
        let baby: any = null;

        if (babyId) {
            baby = await prisma.baby.findUnique({ where: { id: BigInt(babyId) } });
        }

        const tips = await prisma.expertTip.findMany({
            where: baby ? {
                minAgeMonth: { lte: Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000)) },
                maxAgeMonth: { gte: Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / (30 * 24 * 60 * 60 * 1000)) }
            } : {},
            take: 3,
            orderBy: { createdAt: 'desc' }
        });

        return sendSuccess(res, tips);
    }

    if (method === 'POST') {
        const body = await parseBody<any>(req);
        const provider = AIFactory.createProvider();

        let babyProfile: any = undefined;
        if (body.babyId) {
            const baby = await prisma.baby.findUnique({ where: { id: BigInt(body.babyId) } });
            if (baby) {
                const days = Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / (1000 * 60 * 60 * 24));
                const months = Math.floor(days / 30);
                babyProfile = {
                    name: baby.name,
                    gender: baby.gender,
                    birthDate: baby.birthDate,
                    month: months,
                    days,
                    ageStr: months >= 1 ? `${months}个月` : `${days}天`
                };
            }
        }

        const result = await provider.analyze({
            babyProfile,
            recentRecords: { feeding: [], sleep: [], growth: [] },
            query: body.query || ''
        });

        return sendSuccess(res, result);
    }

    sendError(res, 'Method Not Allowed', 405);
}

async function handleStatistics(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const parsedUrl = parse(req.url || '/', true);
    const action = parsedUrl.query.action as string;

    if (action === 'charts') {
        const babyId = parsedUrl.query.babyId ? parseInt(parsedUrl.query.babyId as string) : undefined;
        if (!babyId) return sendError(res, 'Missing babyId');

        const bId = BigInt(babyId);
        const days = parseInt(parsedUrl.query.range as string) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const [feeding, sleep, growth] = await Promise.all([
            prisma.feedingRecord.findMany({
                where: { babyId: bId, time: { gte: startDate } }
            }),
            prisma.sleepRecord.findMany({
                where: { babyId: bId, startTime: { gte: startDate } }
            }),
            prisma.growthRecord.findMany({
                where: { babyId: bId }
            })
        ]);

        return sendSuccess(res, {
            feeding: feeding.map(f => ({ date: f.time, amount: f.amount })),
            sleep: sleep.map(s => ({ date: s.startTime, duration: s.duration })),
            growth
        });
    }

    sendSuccess(res, {});
}

async function handleNotifications(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const method = req.method || 'GET';

    if (method === 'GET') {
        const notifications = await prisma.notification.findMany({
            where: { userId: BigInt(userId) },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return sendSuccess(res, notifications);
    }

    sendError(res, 'Method Not Allowed', 405);
}

async function handleSettings(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const parsedUrl = parse(req.url || '/', true);
    const action = parsedUrl.query.action as string;
    const method = req.method || 'GET';

    if (method === 'GET' && action === 'get') {
        const config = await prisma.gitHubConfig.findUnique({
            where: { userId: BigInt(userId) }
        });
        return sendSuccess(res, { configured: !!config, config });
    }

    if (method === 'POST' && action === 'save') {
        const body = await parseBody<any>(req);
        const config = await prisma.gitHubConfig.upsert({
            where: { userId: BigInt(userId) },
            update: body,
            create: { ...body, userId: BigInt(userId) }
        });
        return sendSuccess(res, config);
    }

    sendError(res, 'Method Not Allowed', 405);
}

async function handleTimeline(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const parsedUrl = parse(req.url || '/', true);
    const babyId = parsedUrl.query.babyId ? parseInt(parsedUrl.query.babyId as string) : undefined;

    if (!babyId) return sendError(res, 'Missing babyId');

    const bId = BigInt(babyId);

    const [feeding, sleep, diaper, growth] = await Promise.all([
        prisma.feedingRecord.findMany({
            where: { babyId: bId },
            orderBy: { time: 'desc' },
            take: 20
        }),
        prisma.sleepRecord.findMany({
            where: { babyId: bId },
            orderBy: { startTime: 'desc' },
            take: 20
        }),
        prisma.diaperRecord.findMany({
            where: { babyId: bId },
            orderBy: { time: 'desc' },
            take: 20
        }),
        prisma.growthRecord.findMany({
            where: { babyId: bId },
            orderBy: { time: 'desc' },
            take: 10
        })
    ]);

    const timeline = [
        ...feeding.map(f => ({ type: 'feeding', data: f, time: f.time })),
        ...sleep.map(s => ({ type: 'sleep', data: s, time: s.startTime })),
        ...diaper.map(d => ({ type: 'diaper', data: d, time: d.time })),
        ...growth.map(g => ({ type: 'growth', data: g, time: g.time }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return sendSuccess(res, { timeline });
}

async function handleUser(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    const parsedUrl = parse(req.url || '/', true);
    const action = parsedUrl.query.action as string;
    const method = req.method || 'GET';

    if (method === 'GET' && action === 'info') {
        const user = await prisma.user.findUnique({
            where: { id: BigInt(userId) },
            select: {
                id: true, phone: true, email: true, nickname: true,
                avatarUrl: true, defaultBabyId: true, settings: true,
                createdAt: true
            }
        });
        return sendSuccess(res, user);
    }

    if (method === 'PUT' && action === 'update') {
        const body = await parseBody<any>(req);
        const user = await prisma.user.update({
            where: { id: BigInt(userId) },
            data: body
        });
        return sendSuccess(res, user);
    }

    sendError(res, 'Method Not Allowed', 405);
}

async function handleUpload(req: http.IncomingMessage, res: http.ServerResponse, userId: number) {
    if (req.method !== 'POST') {
        return sendError(res, 'Method Not Allowed', 405);
    }

    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
        try {
            const body = Buffer.concat(chunks).toString();
            const formData = JSON.parse(body);
            const { url, filename } = formData;

            if (!url || !filename) {
                return sendError(res, 'Missing url or filename');
            }

            return sendSuccess(res, {
                message: 'Upload placeholder - implement with file storage',
                url,
                filename
            }, 201);
        } catch {
            sendError(res, 'Invalid request');
        }
    });
}

const PORT = parseInt(process.env.PORT || '3000');

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
    console.log(`🚀 Nutri-Baby API Server running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
});

export default server;
