# 前端交接文档 — 魔女审判人格测试

> 本文档供前端开发/AI参考，定义项目架构、组件职责、数据流和交互规范。
> **不含具体样式数值**，仅描述视觉目标和交互行为。

---

## 1. 项目概览

- **项目名**: WITCH-TRIAL（魔女审判）
- **类型**: 单页人格测试 Web 应用
- **IP**: 原创「魔法少女的魔女审判」
- **核心体验**: 用户扮演"被审判的魔女"，回答26道情境题，最终被判定为13名角色之一
- **用户群体**: 16-28岁，二次元/视觉小说爱好者

---

## 2. 技术栈

| 层 | 技术 | 版本约束 |
|---|---|---|
| 框架 | Next.js (App Router) | 16.x |
| 语言 | TypeScript | strict |
| 样式 | Tailwind CSS | v4 |
| UI组件 | shadcn/ui | — |
| 动画 | Framer Motion | — |
| 粒子 | Canvas 2D（手写） | — |
| 庆祝 | canvas-confetti | — |
| 打字机 | typewriter-effect | — |
| 数据库 | Prisma + SQLite | v6（非v7）|
| 运行时 | React 19 + use client | — |

### 关键约束

1. **所有页面组件必须标记 `"use client"`**（Next.js App Router 客户端组件）
2. **不使用 Next.js 的 Route/Link/Navigation**，纯状态驱动单页切换
3. **Tailwind v4**: 用 CSS 变量定义主题色（在 globals.css 中），组件通过 `var(--wt-xxx)` 引用
4. **Prisma v6**: `import { PrismaClient } from "@prisma/client"`，不用适配器
5. **字体**: Noto Sans SC（正文）+ Cinzel（装饰/哥特标题）
6. **不使用 next/font 的全局注入**，字体通过 `<link>` 或 CSS `@import` 引入

---

## 3. 主题与视觉目标

### 3.1 视觉关键词

**哥特 + 魔法少女 + 高级感 + 沉浸式**

- 深色背景（接近纯黑的深紫黑）
- 主色调：幽紫（accent）、暗金（warm）
- 辅助色：冰蓝、银白
- 卡片：毛玻璃效果（glassmorphism）
- 背景：动态粒子 + 旋转魔法阵 + 极光/雾气层
- 文字：大量留白，节奏感强

### 3.2 视觉原则

1. **舒适优先**: 不能一眼看过去很乱，要有呼吸感
2. **高级感**: 动画精致但不花哨，克制但到位
3. **沉浸感**: 背景、文字、交互共同营造"审判"氛围
4. **一致性**: 所有屏幕共享同一套视觉语言（配色、卡片风格、动画曲线）

### 3.3 CSS 变量体系

在 `globals.css` 中定义以下变量（具体值由前端开发者决定）：

```
--wt-bg          页面主背景
--wt-accent      主强调色（紫）
--wt-warm        暖强调色（金）
--wt-text        主文字色
--wt-text-2      次要文字色
--wt-text-3      辅助/标签文字色
--wt-card        卡片背景
--wt-card-border 卡片边框
```

### 3.4 全局 CSS 类

| 类名 | 用途 | 描述 |
|------|------|------|
| `.grain-overlay` | 全局噪点纹理 | fixed覆盖层，SVG feTurbulence，极低透明度 |
| `.glass-card` | 通用卡片 | 毛玻璃效果：backdrop-blur + 半透明背景 + 细边框 |
| `.glow-btn` | 主按钮 | 悬停时边框发光，::before渐变光晕 |
| `.option-card` | 答题选项卡 | 悬停时shimmer扫光效果 |

---

## 4. 应用架构

### 4.1 三屏状态机

```
welcome ──(点击"接受审判")──▶ test ──(答完26题)──▶ result
   ▲                                                    │
   └────────────────(点击"重新审判")─────────────────────┘
```

- **状态管理**: React `useState`，无路由库
- **切换动画**: Framer Motion `AnimatePresence mode="wait"`
- **切换效果**: 模糊淡入淡出 + 微缩放

### 4.2 页面组件 `page.tsx` 职责

- 管理当前屏幕状态（welcome / test / result）
- 预加载题目数据（GET /api/quiz）
- 处理答题完成逻辑（POST /api/match + POST /api/results）
- 显示全局加载遮罩（"审判中"）
- 持久挂载 `<BackgroundEffect />`（不随屏幕切换销毁）

---

## 5. 组件详细规范

### 5.1 BackgroundEffect

**职责**: Canvas 全屏背景，营造魔法阵 + 粒子 + 极光 + 雾气的沉浸氛围

**技术要求**:
- 单个 `<canvas>` fixed 全屏，`pointer-events: none`
- 60fps requestAnimationFrame 循环
- 窗口 resize 自适应
- 返回 Fragment: `<canvas>` + `<div className="grain-overlay" />`

**视觉元素（4层）**:

| 层 | 元素 | 行为 |
|----|------|------|
| 底层 | 渐变背景 | 从上到下的深紫黑渐变 |
| 层2 | 极光（Aurora） | 缓慢飘动的径向渐变光斑 |
| 层3 | 魔法阵（Magic Circle） | 中心位置，缓慢旋转，多环 + 六芒星 + 刻度线 |
| 层4 | 粒子系统 | 约80个粒子，向上飘浮，闪烁，多种颜色 |
| 层5 | 雾气（Fog） | 2-3个缓慢漂移的模糊光团 |

**关键**: 所有效果的透明度必须在正常显示器上**肉眼可见**。测试标准：在 100% 亮度下，背景效果清晰可辨，不是"几乎看不见"。

**粒子规格**:
- 颜色：紫系为主，少量冰蓝，极少量金色
- 大小：核心1-3px，光晕为核心3倍
- 行为：向上飘浮，边界循环，闪烁（正弦波调制透明度）

### 5.2 WelcomeScreen

**职责**: 审判启动页，展示标题、故事引言、开始按钮

**Props**: `{ onStart: () => void }`

**布局**（从上到下）:
1. **标题 "魔女审判"** — 大字，Cinzel字体，逐字模糊揭示动画（stagger）
2. **副标题** — "你的灵魂将被如何裁决？"，淡入
3. **分隔线** — 水平渐变线，从中心展开
4. **故事引言** — 3行打字机效果 + 1行延迟淡入的关键台词
5. **开始按钮 "接受审判"** — 延迟出现，带呼吸光效

**交互**: 点击按钮 → 调用 `onStart()`

**动画时序**:
- 标题: 0s 开始逐字揭示
- 副标题: 0.6s 淡入
- 分隔线: 0.8s 展开
- 引言: 自动开始打字
- 按钮: ~2.2s 后淡入 + 呼吸光效

### 5.3 TestScreen

**职责**: 逐题展示情境问题，收集答案

**Props**:
```typescript
{
  questions: QuizQuestion[];
  onComplete: (data: {
    answers: { questionId: number; optionId: number; dim: string; score: number }[];
    gateValue?: string;
    triggerFired?: string;
  }) => void;
}
```

**数据模型**:
```typescript
interface QuizQuestion {
  id: number;
  dim: string;       // 维度代码如 "S1", "F2"
  text: string;      // 题目文本
  order: number;     // 排序
  type: string;      // "normal" | "gate" | "trigger"
  options: QuizOption[];
}

interface QuizOption {
  id: number;
  label: string;     // 选项文本
  score: number;     // 1-3 分
  value: string | null;    // gate题: "destroy" | "endure" | "normal" | "normal_alt"
  trigger: string | null;  // trigger题: 角色代码
}
```

**布局**（从上到下）:
1. **粘性顶部** — 进度条（渐变填充）+ 题号 + 百分比
2. **题目区** — 居中，glass-card 包裹的题目文本
3. **选项列表** — 纵向排列，每个选项是可点击的卡片

**题目类型与特殊处理**:
- `gate` 题: 顶部显示「命运分歧」标签，选择后记录 gateValue
- `trigger` 题: 仅当 gateValue 为 "destroy" 或 "endure" 时显示，顶部显示「最终抉择」标签
- `trigger` 题不计入常规题列表的总数进度

**交互**:
- 点击选项 → 选中态（高亮+光晕）→ 400ms 延迟 → 自动进入下一题
- 选中期间禁用所有选项
- 最后一题回答后 → 调用 `onComplete()`

**动画**:
- 题目切换: AnimatePresence，旧题向上淡出+模糊，新题从下淡入+去模糊
- 选项入场: 交错动画（stagger），从右侧滑入
- 选中效果: 边框高亮 + 背景变亮 + 外发光

**持久化**: 答题进度保存到 localStorage（key: "witch-trial-progress"），页面刷新可恢复

### 5.4 ResultScreen

**职责**: 展示审判结果 — 匹配角色、维度分析、相似角色、统计数据

**Props**:
```typescript
{
  result: {
    code: string;           // 角色代码如 "HIRO"
    name: string;           // 角色名如 "二阶堂希罗"
    subtitle?: string;      // 副标题
    slogan: string;         // 标语
    desc: string;           // 描述文本
    keywords?: string;      // 关键词，中文顿号分隔
    similarity: number;     // 相似度百分比
    userVector: string;     // 用户向量字符串
    templateVector: string; // 角色理想向量字符串
    top3: { code: string; name: string; similarity: number }[];
    group: string;          // 角色分组
    borderType: boolean;    // 是否边界类型
    special: boolean;       // 是否特殊触发
  };
  stats?: {
    totalParticipants: number;
    typePercentage: number;
    typeCount: number;
  } | null;
  onRestart: () => void;
}
```

**布局**（从上到下，max-w-2xl 居中）:
1. **揭示动画** — clip-path 圆形扩展（从中心向外）
2. **Verdict 标签** — 小字 "VERDICT"
3. **"魔女审判" 标题** — 逐字揭示（同 WelcomeScreen）
4. **角色名** — 大字 Cinzel，角色代码 + 相似度
5. **分隔线**
6. **标语** — 斜体，角色个人标语文本
7. **描述卡片** — glass-card，角色描述段落 + 关键词标签
8. **维度分析** — 4组（对应4个模型），每组3个维度条
9. **相似角色列表** — Top3 的第2、3名
10. **统计数据** — 全球百分比
11. **操作按钮** — "复制链接" + "重新审判"

**维度分析组件 DimensionBar**:
- 显示：维度名 + 用户值条 + 角色理想值标记线
- 分组：4组（罪业之秤/堕落之翼/羁绊之锁/因子觉醒），每组 glass-card 包裹
- 动画：交错入场

**庆祝效果**: 页面加载时触发 canvas-confetti 粒子爆发（紫/金/蓝色系）

**动画时序**: 所有元素按从上到下顺序交错出现，总揭示时长约3秒

---

## 6. API 接口

### GET /api/quiz

返回题目、选项、角色模板、维度定义。

**Response**:
```json
{
  "dimensions": [{ "code": "S1", "name": "严厉度", "model": "S", "modelName": "罪业之秤" }],
  "weights": { "S1": 1.5, ... },
  "questions": [{ "id": 1, "dim": "S1", "text": "...", "order": 1, "type": "normal", "options": [...] }],
  "types": [{ "code": "HIRO", "name": "二阶堂希罗", "slogan": "...", "vector": "..." }]
}
```

### POST /api/match

提交答案，返回匹配结果。

**Request**:
```json
{
  "answers": [{ "questionId": 1, "optionId": 1, "dim": "S1", "score": 3 }],
  "gateValue": "destroy",
  "triggerFired": "YUKI"
}
```

**Response**: 完整的 `result` 对象（见 ResultScreen Props）

### POST /api/results

保存测试记录，返回统计数据。

**Response**:
```json
{
  "totalParticipants": 1234,
  "typePercentage": 5.2,
  "typeCount": 64
}
```

---

## 7. 动画规范

### 7.1 通用缓动函数

所有动画使用自定义缓动: `[0.25, 0.1, 0.25, 1]`（easeOutQuint 近似）

### 7.2 模糊揭示（Blur Reveal）

多个组件共享同一套模糊揭示动画:
- 初始: opacity 0, blur 8-12px, y偏移 10-20px
- 结束: opacity 1, blur 0, y 0
- 用于: 标题逐字、卡片入场、段落显示

### 7.3 屏幕切换

```typescript
{
  initial: { opacity: 0, filter: "blur(8px)" },
  animate: { opacity: 1, filter: "blur(0px)" },
  exit: { opacity: 0, filter: "blur(8px)", scale: 0.98 },
  transition: { duration: 0.6 }
}
```

### 7.4 结果揭示

clip-path 圆形扩展:
- 初始: `circle(0% at 50% 40%)`
- 结束: `circle(120% at 50% 40%)`
- 时长: ~1s，缓动 easeInOutCubic

---

## 8. 响应式要求

- **移动端优先**: 所有布局在 375px 宽度下必须可用
- **断点**: sm(640px) 用于字号和间距调整
- **不使用** md/lg/xl 断点，此应用只有两个档位：移动和桌面
- **最大内容宽度**: max-w-2xl (672px)，居中
- **进度条和选项**: 在移动端需要足够的触摸区域

---

## 9. 文件结构

```
src/
├── app/
│   ├── layout.tsx          # 字体、全局meta
│   ├── page.tsx            # 三屏状态机
│   ├── globals.css         # CSS变量 + 全局类
│   └── api/
│       ├── quiz/route.ts   # GET 题目
│       ├── match/route.ts  # POST 匹配
│       └── results/route.ts # POST 记录
├── components/
│   ├── WelcomeScreen.tsx   # 审判启动屏
│   ├── TestScreen.tsx      # 答题屏
│   ├── ResultScreen.tsx    # 结果屏
│   ├── BackgroundEffect.tsx # Canvas背景
│   ├── DimensionBar.tsx    # 维度条
│   └── ui/                 # shadcn组件
├── data/
│   └── quiz-content.ts     # 所有内容数据（换皮只改此文件）
├── lib/
│   ├── match.ts            # 匹配算法
│   └── db.ts               # Prisma单例
└── types/
    └── canvas-confetti.d.ts
```

---

## 10. Gemini 输出对接方式

Gemini 输出的 HTML 文档将作为视觉参考。对接时遵循以下原则：

1. **结构对齐**: Gemini 输出的 HTML 结构映射到对应 React 组件
2. **样式提取**: 将 Gemini 的内联/CSS 样式转换为 Tailwind 类 + CSS 变量
3. **动画替换**: 将 CSS 动画替换为 Framer Motion 声明式动画
4. **交互绑定**: 将 HTML 事件替换为 React 状态管理
5. **组件拆分**: 每个"屏幕"对应一个 React 组件文件
6. **不修改**: 数据层（api/、lib/、data/）和页面状态管理逻辑

### Gemini 应输出的内容

单个完整 HTML 文件，包含：
- 所有 CSS（内嵌 `<style>`）
- 三个屏幕的完整 HTML 结构（用注释分隔 `<!-- Screen: Welcome -->`）
- 所有动画和交互效果（CSS 动画 + 最少量 JS）
- Canvas 背景效果的完整 JS 代码
- 移动端响应式适配

### Gemini 不需要关心的内容

- React/Next.js 框架代码
- API 调用和数据获取
- 状态管理逻辑
- Prisma/数据库相关
- TypeScript 类型
