// Markdown 解析测试
// 运行: npx ts-node test-markdown.ts

import { marked } from 'marked'

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
})

// 模拟 AI 返回的内容（带 Markdown 格式）
const aiContent = `## 现状评估
- 喂养情况：新生儿期宝宝胃容量小，需按需喂养
- 睡眠情况：每天约16-18小时

## 建议
1. **按需喂养**：无时间限制
2. 保持室温24-26℃

---

温馨提示：如有异常请就医。`

async function testMarkdown() {
  console.log('=== 测试 Markdown 解析 ===\n')
  console.log('原始内容:')
  console.log(aiContent)
  console.log('\n--- 分割线 ---\n')

  try {
    const result = await marked.parse(aiContent)
    console.log('解析结果 (typeof:', typeof result, '):')
    console.log(result)
    console.log('\n--- 分割线 ---\n')
    
    // 检查是否包含 HTML 标签
    const hasHtmlTags = result.includes('<h2>') || result.includes('<ul>') || result.includes('<li>')
    console.log('是否包含 HTML 标签:', hasHtmlTags)
    
    // 检查是否有原始的 ** 符号（说明没解析）
    const hasUnescaped = result.includes('**')
    console.log('是否还有 ** 未解析:', hasUnescaped)
    
    if (hasHtmlTags && !hasUnescaped) {
      console.log('\n✅ Markdown 解析正常！')
    } else {
      console.log('\n❌ Markdown 解析可能有问题')
    }
  } catch (e: any) {
    console.error('❌ 解析失败:', e.message)
  }
}

testMarkdown()
