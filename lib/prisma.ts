import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prismaClientSingleton = () => {
    const accelerateUrl = process.env.PRISMA_DATABASE_URL;
    const directUrl = process.env.DATABASE_URL;
    
    // 优先选择加速地址，如果没有则用直连地址
    let url = accelerateUrl || directUrl;
    
    if (!url) return new PrismaClient();

    // 自动检测是否为 Prisma 官方加速器/加速协议
    const isAccelerateHost = url.includes('prisma-data.net') || url.includes('db.prisma.io');
    const isAccelerateProtocol = url.startsWith('prisma://') || url.startsWith('prisma+postgres://');

    if (isAccelerateHost || isAccelerateProtocol) {
        // 强制标准化为 prisma:// 协议，这是 withAccelerate() 插件的要求
        let formattedUrl = url;
        if (url.startsWith('postgres://')) {
            formattedUrl = url.replace('postgres://', 'prisma://');
        } else if (url.startsWith('postgresql://')) {
            formattedUrl = url.replace('postgresql://', 'prisma://');
        } else if (url.startsWith('prisma+postgres://')) {
            formattedUrl = url.replace('prisma+postgres://', 'prisma://');
        }

        console.log(`[Prisma] Detected Accelerate/Proxy URL. Normalizing to prisma:// protocol.`);
        
        return new PrismaClient({
            datasourceUrl: formattedUrl,
        }).$extends(withAccelerate());
    }
    
    console.log(`[Prisma] Using standard direct connection.`);
    return new PrismaClient({
        datasourceUrl: url,
    });
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = (globalThis as any).prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') (globalThis as any).prisma = prisma
