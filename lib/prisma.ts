import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prismaClientSingleton = () => {
    const accelerateUrl = process.env.PRISMA_DATABASE_URL;
    const directUrl = process.env.DATABASE_URL;
    
    let url = accelerateUrl || directUrl;
    
    if (url && (url.startsWith('prisma://') || url.startsWith('prisma+postgres://'))) {
        // If it starts with prisma+postgres://, try converting to prisma:// as some extension versions are strict
        const formattedUrl = url.startsWith('prisma+postgres://') 
            ? url.replace('prisma+postgres://', 'prisma://') 
            : url;
            
        return new PrismaClient({
            datasourceUrl: formattedUrl,
        }).$extends(withAccelerate());
    }
    
    // Fallback: Direct connection without accelerate extension
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
