import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始清理数据库测试数据...');

  try {
    // 获取所有表名
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations');

    // 禁用外键检查并清空表（PostgreSQL 推荐使用 TRUNCATE CASCADE）
    for (const table of tables) {
      console.log(`- 清理表: ${table}`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${table}" RESTART IDENTITY CASCADE;`);
    }

    console.log('成功清空所有业务数据！');
  } catch (error) {
    console.error('清理失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
