import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prismaClientSingleton = () => {
    const accelerateUrl = process.env.PRISMA_DATABASE_URL;
    const directUrl = process.env.DATABASE_URL;
    
    let url = accelerateUrl || directUrl;
    
    console.log(`[Prisma] Initializing. Accelerate URL present: ${!!accelerateUrl}, Direct URL present: ${!!directUrl}`);
    
    if (url && (url.startsWith('prisma://') || url.startsWith('prisma+postgres://'))) {
        const formattedUrl = url.startsWith('prisma+postgres://') 
            ? url.replace('prisma+postgres://', 'prisma://') 
            : url;
            
        console.log(`[Prisma] Using Accelerate extension with protocol: ${formattedUrl.split(':')[0]}`);
        return new PrismaClient({
            datasourceUrl: formattedUrl,
        }).$extends(withAccelerate());
    }
    
    console.log(`[Prisma] Using direct connection fallback (No Accelerate)`);
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
