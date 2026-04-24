# API Reference

Nutri-Baby 后端 API 接口文档。所有接口均需要认证，Token 通过 `Authorization: Bearer <token>` header 传递。

## 基础信息

- **Base URL**: `/api`
- **认证**: JWT Bearer Token
- **返回格式**: JSON

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息"
}
```

---

## 认证接口

### POST /api/auth/login

用户登录

**请求体**:

```json
{
  "phone": "13800138000",
  "password": "your_password"
}
```

**响应**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "phone": "13800138000",
    "nickname": "用户名"
  }
}
```

---

### POST /api/auth/register

用户注册

**请求体**:

```json
{
  "phone": "13800138000",
  "password": "your_password",
  "nickname": "用户名"
}
```

---

### POST /api/auth/logout

用户登出 (前端清除 Token 即可)

---

## 用户接口

### GET /api/user/info

获取用户信息

**响应**:

```json
{
  "id": "1",
  "phone": "13800138000",
  "email": "user@example.com",
  "nickname": "用户名",
  "avatarUrl": "https://...",
  "defaultBabyId": "1",
  "settings": {},
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### PUT /api/user/update

更新用户信息

**请求体**:

```json
{
  "nickname": "新昵称",
  "avatarUrl": "https://..."
}
```

---

### PUT /api/user/change-password

修改密码

**请求体**:

```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码"
}
```

---

### DELETE /api/user/delete-account

注销账户

---

## 宝宝接口

### GET /api/baby

获取宝宝列表

**响应**:

```json
{
  "babies": [
    {
      "id": "1",
      "name": "宝宝名",
      "birthDate": "2024-01-01",
      "gender": "male",
      "avatarUrl": "https://..."
    }
  ]
}
```

---

### POST /api/baby

添加宝宝

**请求体**:

```json
{
  "name": "宝宝名",
  "birthDate": "2024-01-01",
  "gender": "male"
}
```

---

### GET /api/baby/:babyId

获取宝宝详情

---

### PUT /api/baby/:babyId

更新宝宝信息

---

### DELETE /api/baby/:babyId

删除宝宝

---

### POST /api/baby/:babyId/invite

邀请家庭成员

**请求体**:

```json
{
  "phone": "13800138001",
  "role": "guardian",
  "relationship": "妈妈"
}
```

---

### POST /api/baby/join

加入家庭

**请求体**:

```json
{
  "inviteCode": "XXXXXX"
}
```

---

### GET /api/baby/:babyId/vaccines

获取疫苗列表

---

## 记录接口

记录接口使用 `type` 参数区分不同类型: `feeding`, `sleep`, `diaper`, `growth`

### GET /api/record/:type

获取记录列表

**查询参数**:

- `babyId`: 宝宝 ID
- `startDate`: 开始日期 (ISO 8601)
- `endDate`: 结束日期
- `page`: 页码
- `limit`: 每页数量

---

### POST /api/record/:type

创建记录

**喂奶记录 (feeding)**:

```json
{
  "babyId": "1",
  "time": "2024-01-01T08:00:00Z",
  "feedingType": "bottle",
  "amount": 150,
  "detail": {}
}
```

**睡眠记录 (sleep)**:

```json
{
  "babyId": "1",
  "startTime": "2024-01-01T12:00:00Z",
  "endTime": "2024-01-01T14:00:00Z",
  "type": "nap"
}
```

**尿布记录 (diaper)**:

```json
{
  "babyId": "1",
  "time": "2024-01-01T08:00:00Z",
  "type": "pee"
}
```

**成长记录 (growth)**:

```json
{
  "babyId": "1",
  "time": "2024-01-01T00:00:00Z",
  "height": 75.5,
  "weight": 10.2
}
```

---

## 相册接口

### GET /api/album

获取相册列表

**查询参数**:

- `babyId`: 宝宝 ID
- `albumType`: 相册类型 (`growth`, `moment`)
- `page`: 页码
- `limit`: 每页数量

---

### POST /api/album

上传照片

**请求体** (FormData):

```
babyId: "1"
title: "照片标题"
description: "描述"
url: "https://..."
filename: "photo.jpg"
albumType: "growth"
```

---

### GET /api/album?action=share

分享照片

**请求体**:

```json
{
  "albumId": "1",
  "type": "caption"
}
```

**响应**:

```json
{
  "shareUrl": "https://nutri-baby.com/share/abc123",
  "caption": "📸 宝宝的成长记录..."
}
```

---

### POST /api/album?action=comment

评论照片

```json
{
  "albumId": "1",
  "content": "太可爱了！"
}
```

---

### POST /api/album?action=like

点赞

```json
{
  "albumId": "1"
}
```

---

## AI 智能助手

### POST /api/ai

AI 智能分析

**请求体**:

```json
{
  "babyId": "1",
  "query": "最近奶量怎么样？"
}
```

**响应**:

```json
{
  "insight": "根据最近的喂养记录...",
  "sentiment": "positive",
  "recommendations": [
    "建议增加辅食种类",
    "注意补充维生素D"
  ]
}
```

---

### GET /api/ai?action=tips

获取每日育儿建议

**查询参数**:

- `babyId`: 宝宝 ID
- `forceAI`: `true` 强制 AI 生成

---

## 统计接口

### GET /api/statistics?action=charts

获取统计数据

**查询参数**:

- `babyId`: 宝宝 ID
- `range`: 天数 (默认 7)

---

### GET /api/statistics?action=standards

获取 WHO 生长标准数据

---

### POST /api/statistics?action=seed_standards

初始化 WHO 标准数据 (管理员)

---

## 通知接口

### GET /api/notifications

获取通知列表

---

### PUT /api/notifications/:id/read

标记已读

---

## 设置接口

### GET /api/settings

获取 GitHub 同步配置

---

### POST /api/settings?action=save

保存 GitHub 配置

**请求体**:

```json
{
  "token": "ghp_xxx",
  "owner": "username",
  "repo": "nutri-baby-backup",
  "branch": "main",
  "autoSync": true,
  "syncInterval": "daily"
}
```

---

### POST /api/settings?action=sync

手动触发 GitHub 同步

---

### GET /api/settings?action=logs

获取同步日志

---

## 时间线接口

### GET /api/timeline

获取时间线数据

**查询参数**:

- `babyId`: 宝宝 ID
- `startDate`: 开始日期
- `endDate`: 结束日期

---

## 错误代码

| 代码 | 说明 |
|:---:|:----|
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

*相关文档: [自托管部署](../09_self_hosting.md) | [开发指南](../03_development.md)*
