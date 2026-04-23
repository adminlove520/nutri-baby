# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2.0.1] - 2026-04-24

### Added
- **GitHub 图床同步**: 支持配置 GitHub Token、仓库、分支，实现图库自动同步到 GitHub
- **定时同步策略**: 可选择同步哪些类型的相册（成长记录/精彩瞬间/疫苗记录）
- **成长相册功能**: 朋友圈样式的相册展示，支持评论和点赞
- **分享功能**: 生成分享链接和 AI 文案

### Changed
- **系统设置重构**: 定时任务模块支持独立配置各功能开关
- **移动端适配**: 全项目响应式设计优化

### Fixed
- 修复 Timeline 删除 API 路径错误
- 修复 record.ts 中 deleteRecord 函数 token 未定义 bug
- 修复 Home.vue 站内信和头像图标重复问题

## [2.0.0] - 2026-03-01

### Added
- 全新 UI 界面设计
- 成长记录、相册功能
- 疫苗接种管理

## [1.2.0] - 2026-01-15

### Added
- PWA 离线支持
- 每日 AI 育儿锦囊
- 邮件通知系统

## [1.0.0] - 2025-12-01

### Added
- 基础功能上线
- 宝宝管理
- 喂养、睡眠、排泄记录
