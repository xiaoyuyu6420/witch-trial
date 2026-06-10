<div align="center">

# 魔女审判

**WITCH TRIAL · MAGICAL GIRL PERSONALITY QUIZ**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://hub.docker.com/r/xiaoyuyu123/magical-girls-witch-trial)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

扮演受审的魔女，回答 26 道情境题，看看你会被审判为谁。

</div>

---

## 它是什么

十三名预备魔女被囚禁在一座孤岛上。你不是旁观者——你是被告。

通过 26 道情境题和 12 维向量匹配算法，系统会把你对应到 16 种人格原型之一。每个人格都有独立的故事、关键词和「slogan」——不是那种「你是 INFJ 所以你很稀有」的套话，而是把你放进魔法少女的世界观里审判。

<p align="center">
  <img src="docs/screenshot-landing.png" width="45%" alt="landing page">
  <img src="docs/screenshot-result.png" width="45%" alt="result page">
</p>

## 特色

- **26 道情境题** — 不是「你喜欢猫还是狗」，而是让你做道德困境和生死抉择
- **16 种人格** — 4 个分组（羁绊 / 堕落 / 审判 / 觉醒）+ 2 个隐藏人格（有触发条件）
- **12 维匹配算法** — 加权曼哈顿距离 + 门控/触发机制 + 边界检测，不是随便分分类
- **4 种语言** — 简中 / 繁中 / English / 日本語
- **服务端验证** — 答案的维度分由服务端从数据库重新计算，前端改分没用
- **管理后台** — 密码保护，可以编辑题库、人格定义、导出数据
- **暗黑美学** — 全屏粒子动画、自定义光标、文字解码特效

## 本地开发

需要 Node.js 20+。

```bash
git clone https://gitee.com/XYY526/magical-girls-witch-trial.git
cd magical-girls-witch-trial
npm install
cp .env.example .env
npx prisma generate && npx prisma db push && npx tsx prisma/seed.ts
npm run dev
```

打开 http://localhost:3010

## 部署

### 一键部署（推荐）

服务器上执行：

```bash
curl -sSL https://gitee.com/XYY526/magical-girls-witch-trial/raw/main/scripts/deploy.sh | bash
```

脚本会创建目录、下载 `docker-compose.yml`、引导你设置密码、配置镜像加速，然后拉起容器。

### 手动部署

```bash
mkdir -p /home/magical-girls/{data,backups} && cd /home/magical-girls
curl -o docker-compose.yml https://gitee.com/XYY526/magical-girls-witch-trial/raw/main/docker-compose.yml
echo "ADMIN_PASSWORD=你的密码" > .env
docker compose pull && docker compose up -d
```

访问 `http://服务器IP:8091`

### 更新

```bash
cd /home/magical-girls && docker compose pull && docker compose up -d
```

数据在 `./data/witch-trial.db`，备份每 6 小时自动跑一次，存在 `./backups/`，保留最近 30 份。

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (standalone output) |
| 前端 | React 19 · Tailwind CSS v4 · Framer Motion |
| 数据库 | Prisma + SQLite |
| 部署 | Docker · GitHub Actions → Docker Hub |
| 语言 | TypeScript |

## 16 种人格

| 分组 | 角色 | slogan |
|---|---|---|
| 羁绊 | 樱羽艾玛 | 「即使全世界都放弃了，我也不会」 |
| 羁绊 | 橘雪莉 | 「为了你，我可以成为任何人——甚至坏人」 |
| 羁绊 | 佐伯米莉亚 | 「不用怕，姐姐来扛」 |
| 堕落 | 二阶堂希罗 | 「哪怕要死一千次，我也要把她带回来」 |
| 堕落 | 黑部奈叶香 | 「不需要同伴，不需要温暖，我只要复仇」 |
| 审判 | 远野汉娜 | 「我才不关心你呢……笨蛋」 |
| 审判 | 冰上梅露露 | 「我等了很久……很久很久」 |
| 审判 | 泽渡可可 | 「别误会，我只是无聊才跟你说话」 |
| 审判 | 城崎诺亚 | 「这个颜色……好漂亮，我想把它画下来」 |
| 觉醒 | 宝生玛格 | 「别太在意我，我只是路过的」 |
| 觉醒 | 夏目安安 | 「只有你……不能离开我」 |
| 混合 | 紫藤亚里沙 | 「少废话，跟上就是了」 |
| 混合 | 莲见蕾雅 | 「看着我的眼睛——告诉我，我在你眼里是闪光的」 |
| 特殊 | 月代雪 | 「你们人类的悲剧……我全都看在眼里」 |
| 特殊 | 不灭雪华 | 「即使世界抛弃了我，我对雪的爱不会消融」 |
| — | 未定之魂 | 「审判还未落锤，你的灵魂在等待被定义」 |

> 特殊人格有隐藏触发条件，不是随机出的。

## CI/CD 架构

```
Gitee（主仓库）→ 自动同步 → GitHub → Actions 构建 → Docker Hub → 服务器拉取
```

服务器在国内，通过阿里云镜像加速拉取 Docker Hub 镜像。推送代码到 Gitee 就会触发整条链路。

## 目录结构

```
src/app/test/       答题和结果页
src/app/api/        后端接口（含管理后台）
src/components/     前端组件
src/data/           题库和人格定义（seed 用）
src/i18n/           多语言（中/繁/英/日）
src/lib/match.ts    匹配算法
prisma/             数据库 schema
scripts/            部署和备份脚本
```

## 仓库

| 平台 | 地址 |
|---|---|
| Gitee | https://gitee.com/XYY526/magical-girls-witch-trial |
| GitHub | https://github.com/xiaoyuyu6420/magical-girls-witch-trial |
| Docker Hub | https://hub.docker.com/r/xiaoyuyu123/magical-girls-witch-trial |

## License

MIT
