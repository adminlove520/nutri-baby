# 自托管部署指南

Nutri-Baby 支持 Docker 一键部署，适合自建服务器或私有云环境。

## 环境要求

| 组件 | 最低配置 | 推荐配置 |
|:----|:---------|:---------|
| CPU | 1 核 | 2 核+ |
| 内存 | 1 GB | 2 GB+ |
| 磁盘 | 10 GB | 50 GB+ |
| Docker | 20.10+ | 最新版 |
| Docker Compose | 2.0+ | 2.0+ |

## 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/nutri-baby.git
cd nutri-baby/deploy/docker
```

### 2. 配置环境变量

```bash
cp .env.selfhosted .env
nano .env  # 编辑填入实际配置
```

### 3. 启动服务

```bash
# 创建数据目录
mkdir -p data/postgres data/redis data/uploads logs

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 4. 初始化数据库

```bash
# 执行数据库迁移
docker-compose exec api npx prisma migrate deploy

# 初始化 WHO 生长标准数据
docker-compose exec api npx prisma db seed
```

### 5. 访问应用

- 前端: http://localhost (或 http://YOUR_SERVER_IP)
- API: http://localhost/api/health

## 数据持久化

所有数据都会持久化到本地目录，**不会因容器删除而丢失**：

```
deploy/docker/
├── data/
│   ├── postgres/     # PostgreSQL 数据文件
│   ├── redis/        # Redis 持久化文件
│   └── uploads/      # 用户上传的文件
├── logs/
│   ├── access.log    # Nginx 访问日志
│   └── error.log     # Nginx 错误日志
├── .env              # 环境变量 (包含敏感信息)
├── docker-compose.yml
└── nginx.conf
```

### 数据目录说明

| 目录 | 说明 | 备份建议 |
|:----|:----|:---------|
| `data/postgres` | 数据库所有数据 | **每日备份** |
| `data/redis` | 缓存数据 (可选) | 不需要 |
| `data/uploads` | 用户上传的文件 | **定期备份** |
| `logs` | 服务运行日志 | 定期清理 |

## 备份与恢复

### 数据库完整备份

```bash
# 进入部署目录
cd deploy/docker

# 备份 (会生成 backup_YYYYMMDD_HHMMSS.sql)
docker-compose exec -T postgres pg_dump -U nutribaby nutribaby > backup_$(date +%Y%m%d_%H%M%S).sql

# 或使用压缩备份
docker-compose exec -T postgres pg_dump -U nutribaby nutribaby | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 数据库恢复

```bash
# 停止服务
docker-compose stop api

# 恢复数据
gunzip -c backup_20240101.sql.gz | docker-compose exec -T postgres psql -U nutribaby nutribaby

# 重启服务
docker-compose start api
```

### 完整备份 (推荐)

```bash
#!/bin/bash
# backup.sh - 完整备份脚本

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec -T postgres pg_dump -U nutribaby nutribaby > $BACKUP_DIR/db_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz data/uploads/

# 备份环境变量
cp .env $BACKUP_DIR/env_$DATE.bak

# 保留最近 30 天备份
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.bak" -mtime +30 -delete

echo "备份完成: $BACKUP_DIR"
```

### 定时备份 (crontab)

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 3 点自动备份
0 3 * * * cd /path/to/nutri-baby/deploy/docker && ./backup.sh >> logs/backup.log 2>&1
```

## 服务架构

```
┌──────────────────────────────────────────────────────────────────┐
│                         用户浏览器                                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │ :80/:443
                    ┌─────▼─────┐
                    │   Nginx   │  反向代理 + 静态资源
                    │  (前端)   │
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
        ┌─────▼─────┐ ┌─▼─────────▼─┐
        │  Frontend  │ │     API     │
        │   (Vue)   │ │   (Node)    │
        │   :3000   │ │   :3000     │
        └───────────┘ └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
        │ PostgreSQL│  │  Redis  │  │  Uploads  │
        │  :5432    │  │  :6379  │  │  (本地)   │
        └───────────┘  └─────────┘  └───────────┘
```

## 环境变量详解

| 变量名 | 必填 | 默认值 | 说明 |
|:------|:---:|:------:|:----|
| `JWT_SECRET` | ✅ | - | JWT 签名密钥 (至少32字符) |
| `POSTGRES_PASSWORD` | ✅ | - | PostgreSQL 密码 |
| `DATABASE_URL` | ✅ | - | PostgreSQL 连接字符串 |
| `AI_PROVIDER` | ❌ | `openai` | AI 服务提供商 |
| `OPENAI_API_KEY` | ❌ | - | OpenAI API Key |
| `SMTP_HOST` | ❌ | - | SMTP 服务器 |
| `SMTP_USER` | ❌ | - | SMTP 用户名 |
| `SMTP_PASS` | ❌ | - | SMTP 密码 |
| `VITE_AMAP_KEY` | ✅ | - | 高德地图 JS API Key |
| `VITE_AMAP_SECURITY_CODE` | ✅ | - | 高德地图安全密钥 |
| `NEXT_PUBLIC_BASE_URL` | ❌ | `http://localhost` | 公共访问 URL |

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f postgres

# 重启服务
docker-compose restart api

# 停止服务 (数据保留)
docker-compose down

# 停止服务并删除数据 (危险!)
docker-compose down -v

# 重新构建镜像
docker-compose build --no-cache

# 进入容器调试
docker-compose exec api sh
docker-compose exec postgres psql -U nutribaby -d nutribaby

# 查看资源使用
docker stats
```

## HTTPS 配置

### 使用 Let's Encrypt (推荐)

```bash
# 安装 certbot
apt install certbot python3-certbot-nginx

# 停止 nginx
docker-compose stop nginx

# 获取证书 (需要域名)
certbot certonly --nginx -d yourdomain.com

# 修改 nginx 配置使用证书后重启
docker-compose start nginx
```

### 自签名证书 (测试用)

```bash
# 生成自签名证书
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/selfsigned.key \
  -out ssl/selfsigned.crt \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=NutriBaby"

# 修改 nginx.conf 添加 HTTPS server
```

## 故障排查

### API 无法启动

```bash
# 1. 检查数据库是否就绪
docker-compose logs postgres | grep "database system is ready"

# 2. 检查数据库连接
docker-compose exec api ping postgres

# 3. 查看 API 详细日志
docker-compose logs -f --tail=100 api

# 4. 检查环境变量
docker-compose exec api env | grep DATABASE
```

### 前端无法访问 API

```bash
# 1. 检查 nginx 配置
docker-compose exec nginx nginx -t

# 2. 检查 API 健康状态
curl http://localhost/api/health

# 3. 查看 nginx 日志
docker-compose logs -f nginx
```

### 数据库迁移失败

```bash
# 查看详细错误
docker-compose logs api | grep -A 10 "Migration"

# 手动重置迁移状态
docker-compose exec api npx prisma migrate resolve --rolled-back "migration_name"

# 或强制重置数据库 (危险!)
docker-compose exec api npx prisma db push --force-reset
```

## 生产环境优化

### 资源限制

当前配置已包含资源限制，可根据服务器配置调整 `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 2G  # 根据可用内存调整
    reservations:
      memory: 512M
```

### 数据库连接池

```yaml
environment:
  - DATABASE_URL=postgresql://.../?connection_limit=20&pool_timeout=10
```

### 监控 (可选)

```yaml
# 添加 Prometheus 监控
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

---

## 相关文档

- [API 文档](./08_api_reference.md)
- [系统架构](./02_architecture.md)
- [开发指南](./03_development.md)
