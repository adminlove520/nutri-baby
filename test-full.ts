// 完整 API 测试脚本
// 运行: npx ts-node test-full.ts

// 设置环境变量
process.env.AI_PROVIDER = 'minimax';
process.env.AI_MODEL = 'MiniMax-M2.7';
process.env.ANTHROPIC_API_KEY = 'sk-cp-creCdxyA4u40aES62D-szlkGvZKhQwwvxOrJiZXGt8yYm91oOknyqPRE9RGS4iZilzlPL4lsYfkCXeY2CWj5ZMzaShHaInWJry0x1X1GvmqLI7pPN24t8lM';
process.env.ANTHROPIC_BASE_URL = 'https://api.minimaxi.com/anthropic';
process.env.AI_API_KEY = 'sk-cp-creCdxyA4u40aES62D-szlkGvZKhQwwvxOrJiZXGt8yYm91oOknyqPRE9RGS4iZilzlPL4lsYfkCXeY2CWj5ZMzaShHaInWJry0x1X1GvmqLI7pPN24t8lM';

import { AIFactory } from './lib/ai/factory';
import { marked } from 'marked';

// 配置 marked
marked.setOptions({ async: false });

async function testFull() {
    console.log('=== 完整 API + Markdown 测试 ===\n');

    // 1. 测试 AI Provider 创建
    console.log('1. 测试 AIFactory.createProvider()');
    const provider = AIFactory.createProvider('minimax');
    console.log('   ✅ Provider 创建成功\n');

    // 2. 测试 AI 调用
    console.log('2. 测试 AI.analyze() 调用 MiniMax API');
    try {
        const result = await provider.analyze({
            babyProfile: {
                name: '张景皓',
                gender: 'male',
                birthDate: new Date('2026-04-16'),
                month: 0,
                ageStr: '9天'
            },
            recentRecords: {
                feeding: [],
                sleep: [],
                growth: []
            },
            query: '宝宝9天，厌奶怎么办？'
        });

        console.log('   ✅ API 调用成功！');
        console.log('   原始响应预览:', result.insight.substring(0, 200) + '...\n');

        // 3. 测试 Markdown 解析
        console.log('3. 测试 Markdown 渲染');
        const htmlContent = marked.parse(result.insight);
        console.log('   typeof htmlContent:', typeof htmlContent);
        
        if (typeof htmlContent === 'string') {
            const hasHtml = htmlContent.includes('<h2>') || htmlContent.includes('<li>') || htmlContent.includes('<strong>');
            const hasMarkdown = htmlContent.includes('**');
            console.log('   包含 HTML 标签:', hasHtml);
            console.log('   还有未解析的 **:', hasMarkdown);
            
            if (hasHtml && !hasMarkdown) {
                console.log('   ✅ Markdown 渲染正常！');
            } else {
                console.log('   ❌ Markdown 渲染有问题');
            }
        } else {
            console.log('   ❌ marked.parse 返回了 Promise!');
        }

        console.log('\n--- HTML 预览 ---');
        console.log((htmlContent as string).substring(0, 500));

    } catch (error: any) {
        console.error('   ❌ API 调用失败:', error.message);
        console.error('   错误详情:', error);
    }
}

testFull();
