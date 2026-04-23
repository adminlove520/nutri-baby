export const VERSION = '2.0.1'
export const BUILD_TIME = new Date().toISOString().split('T')[0]

export const CHANGELOG = `# Nutri-Baby v2.0.1 更新日志

## 🎉 v2.0.1 (2026-04-24)

### 新功能
- **GitHub 图床同步**：支持配置 GitHub Token、仓库、分支，实现图库自动同步到 GitHub
- **定时同步策略**：可选择同步哪些类型的相册（成长记录/精彩瞬间/疫苗记录）
- **成长相册功能**：朋友圈样式的相册展示，支持评论和点赞
- **分享功能**：生成分享链接和 AI 文案

### 优化
- **系统设置重构**：定时任务模块支持独立配置各功能开关
- **移动端适配**：全项目响应式设计优化

### Bug 修复
- 修复 Timeline 删除 API 路径错误
- 修复 record.ts 中 deleteRecord 函数 token 未定义 bug
- 修复 Home.vue 站内信和头像图标重复问题

---

## v2.0.0 (2026-03-01)

### 新功能
- 全新 UI 界面设计
- 成长记录、相册功能
- 疫苗接种管理

---

## v1.2.0 (2026-01-15)

### 新功能
- PWA 离线支持
- 每日 AI 育儿锦囊
- 邮件通知系统

---

## v1.0.0 (2025-12-01)

### 初始版本
- 基础功能上线
- 宝宝管理
- 喂养、睡眠、排泄记录
`

export const LICENSE = `MIT License

Copyright (c) 2025-${new Date().getFullYear()} Nutri-Baby Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
