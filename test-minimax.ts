// MiniMax API 测试脚本
// 运行: npx ts-node test-minimax.ts

// 设置环境变量
process.env.AI_PROVIDER = 'minimax';
process.env.AI_MODEL = 'MiniMax-M2.7';
process.env.ANTHROPIC_API_KEY = 'sk-cp-creCdxyA4u40aES62D-szlkGvZKhQwwvxOrJiZXGt8yYm91oOknyqPRE9RGS4iZilzlPL4lsYfkCXeY2CWj5ZMzaShHaInWJry0x1X1GvmqLI7pPN24t8lM';
process.env.ANTHROPIC_BASE_URL = 'https://api.minimaxi.com/anthropic';
process.env.AI_API_KEY = 'sk-cp-creCdxyA4u40aES62D-szlkGvZKhQwwvxOrJiZXGt8yYm91oOknyqPRE9RGS4iZilzlPL4lsYfkCXeY2CWj5ZMzaShHaInWJry0x1X1GvmqLI7pPN24t8lM';

import { AIFactory } from './lib/ai/factory';

async function testMiniMax() {
    console.log('=== MiniMax API 测试 ===\n');

    // 1. 测试 Factory 创建 Provider
    console.log('1. 测试 AIFactory.createProvider()');
    const provider = AIFactory.createProvider('minimax');
    console.log('   Provider 创建成功\n');

    // 2. 测试 AI 调用
    console.log('2. 测试 AI.analyze() 调用');
    console.log('   发送请求到: https://api.minimaxi.com/anthropic/v1/messages');
    console.log('   模型: MiniMax-M2.7\n');

    try {
        const startTime = Date.now();
        const result = await provider.analyze({
            babyProfile: {
                name: '测试宝宝',
                gender: 'male',
                birthDate: new Date('2026-04-16'),
                month: 0,
                ageStr: '10天'
            },
            recentRecords: {
                feeding: [],
                sleep: [],
                growth: []
            },
            query: '你好'
        });
        const duration = Date.now() - startTime;

        console.log(`   ✅ 调用成功！(耗时 ${duration}ms)`);
        console.log('   完整响应:');
        console.log(result.insight);
    } catch (error: any) {
        console.error('   ❌ 调用失败:', error.message);
        console.error('   错误详情:', error);
    }
}

testMiniMax();
