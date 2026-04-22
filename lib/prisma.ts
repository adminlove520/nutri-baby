import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const prismaClientSingleton = () => {
    let url = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL;
    
    // Fix: Prisma Accelerate often requires 'prisma://' protocol instead of 'prisma+postgres://'
    if (url && url.startsWith('prisma+postgres://')) {
        url = url.replace('prisma+postgres://', 'prisma://');
    }

    return new PrismaClient({
        datasourceUrl: url,
    }).$extends(withAccelerate())
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = (globalThis as any).prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') (globalThis as any).prisma = prisma
