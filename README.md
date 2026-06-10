# 魔女审判

扮演受审的魔女，回答 26 道情境题，看看你会被审判为谁。

## 本地跑起来

```bash
npm install
cp .env.example .env
npx prisma generate && npx prisma db push && npx tsx prisma/seed.ts
npm run dev
```

打开 http://localhost:3010

## 部署

服务器上执行：

```bash
curl -sSL https://gitee.com/XYY526/magical-girls-witch-trial/raw/main/scripts/deploy.sh | bash
```

或者手动：

```bash
mkdir -p /home/magical-girls/{data,backups} && cd /home/magical-girls
curl -o docker-compose.yml https://gitee.com/XYY526/magical-girls-witch-trial/raw/main/docker-compose.yml
echo "ADMIN_PASSWORD=你的密码" > .env
docker compose pull && docker compose up -d
```

访问 `http://服务器IP:8091`

更新的时候：

```bash
cd /home/magical-girls && docker compose pull && docker compose up -d
```

## 目录结构

```
src/app/test/      答题和结果页
src/app/api/       后端接口
src/components/    前端组件
src/data/          题库和人格定义
src/i18n/          多语言（中/繁/英/日）
src/lib/match.ts   匹配算法
prisma/            数据库
scripts/           部署和备份脚本
```

## 技术栈

Next.js 16 · React 19 · Tailwind CSS v4 · Prisma · SQLite · Docker
