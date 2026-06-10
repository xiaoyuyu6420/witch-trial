# 🧙‍♀️ 魔女审判 | WITCH TRIAL

> 在因子侵蚀的尽头，审判等待着你。十三名预备魔女，一座孤岛监牢。

魔女审判是一个魔法少女题材的人格测试 Web 应用。用户扮演"受审的魔女"，回答 26 道情境题，服务端通过加权 12 维向量匹配算法将答案映射到 16 种人格原型。

## 特性

- **26 道情境题** — 每道题对应一个维度分数，包含普通题、门控题和触发题
- **16 种人格原型** — 加权曼哈顿距离匹配算法，支持特殊角色触发和边界检测
- **4 语言支持** — 简体中文、繁体中文、English、日本語
- **管理后台** — 密码保护，支持题库编辑、数据导出、统计查看
- **自动备份** — SQLite 数据库每 6 小时自动备份，保留最近 30 份

## 技术栈

- **前端**: Next.js 16 + React 19 + Tailwind CSS v4 + Framer Motion
- **后端**: Next.js API Routes + Prisma ORM + SQLite
- **部署**: Docker + Docker Compose
- **CI/CD**: GitHub Actions → Docker Hub

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 初始化数据库
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts

# 启动开发服务器 (http://localhost:3010)
npm run dev
```

### 生产部署

```bash
# 一键部署脚本
curl -sSL https://gitee.com/XYY526/magical-girls-witch-trial/raw/main/scripts/deploy.sh | bash
```

或手动部署：

```bash
mkdir -p /home/magical-girls && cd /home/magical-girls
mkdir -p data backups

# 下载配置
curl -o docker-compose.yml https://gitee.com/XYY526/magical-girls-witch-trial/raw/main/docker-compose.yml

# 设置管理员密码
echo "ADMIN_PASSWORD=你的密码" > .env

# 启动
docker compose pull
docker compose up -d
```

访问 `http://服务器IP:8091` 即可使用。

### 日常更新

```bash
cd /home/magical-girls
docker compose pull && docker compose up -d
```

## 项目结构

```
├── src/
│   ├── app/           # Next.js 页面和 API 路由
│   │   ├── test/      # 测试页面（答题 + 结果展示）
│   │   └── api/       # API 端点（/quiz, /match, /results, /admin/*）
│   ├── components/    # React 组件（TestScreen, ResultScreen 等）
│   ├── data/          # 题库和人格类型定义
│   ├── i18n/          # 多语言文件（zh-CN, zh-TW, en, ja）
│   └── lib/           # 核心逻辑（匹配算法、认证、限流）
├── prisma/            # 数据库 Schema 和种子数据
├── scripts/           # 部署和备份脚本
├── public/            # 静态文件（首页）
├── Dockerfile         # Docker 构建配置
└── docker-compose.yml # 生产环境编排
```

## 匹配算法

核心匹配逻辑位于 `src/lib/match.ts`：

1. 收集用户答题的 12 维分数
2. 检查触发条件（门控题 + 触发题组合）
3. 将分数转换为层级（L/M/H/X）
4. 计算与 16 个人格模板的加权曼哈顿距离
5. 取相似度最高的结果，边界情况返回 fallback 类型

## 管理后台

访问 `/admin`，使用 `.env` 中设置的 `ADMIN_PASSWORD` 登录。支持：

- 查看参与统计
- 编辑题库和人格类型
- 导出/导入数据
- 查看用户记录

## 许可证

MIT
