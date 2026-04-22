# 魔女审判人格测试 — 项目规格书

> 版本: 1.0
> 最后更新: 2026-04-17

---

## 1. 项目概览

### 1.1 基本信息

| 字段 | 值 |
|------|-----|
| 项目名称 | WITCH-TRIAL |
| 主题IP | 魔法少女的魔女审判（原创IP） |
| 产品类型 | 人格测试 Web 应用 |
| 测试模式 | 单人 |
| 目标用户 | 16–28 岁，二次元 / 视觉小说 / 暗黑幻想爱好者 |
| 生命周期 | 短期热点（1–2 周） |
| 隐私等级 | 完全匿名 |
| 测试名称 | 「魔女审判 — 你将被判定为谁？」 |
| 测试标语 | 「在因子侵蚀的尽头，审判等待着你」 |
| 总题数 | 26（24 常规 + 1 门控 + 1 触发） |

### 1.2 核心体验

用户扮演一名被"魔女因子"侵蚀的少女，在监牢中接受 26 道审问。答题结束后，系统通过加权向量匹配算法，将用户判定为 13 名原作角色中最接近的一位（或触发 2 种隐藏角色），生成「审判报告」。

结果页面风格为：**「你是【角色全名】型的魔女」** + 角色标语 + 角色描述 + 维度对比 + Top 3 匹配 + 群体定位。

---

## 2. 维度体系

### 2.1 模型与维度

共 4 个模型，每模型 3 个维度，共 **12 维度**。每维度测 2 道题，分值 1/2/3，总分范围 2–6。

#### Model S — 罪业之秤（审判维度）

| 编号 | 维度名 | 方向 | 说明 |
|------|--------|------|------|
| S1 | 严厉度 | L=宽容 → H=严苛 | 对他人罪过与错误的苛责程度 |
| S2 | 直觉度 | L=理性 → H=感性 | 判断事物时依赖理性分析还是直觉情感 |
| S3 | 宽恕度 | L=不宽恕 → H=易宽恕 | 对不可饶恕之事的宽恕能力 |

#### Model F — 堕落之翼（堕落维度）

| 编号 | 维度名 | 方向 | 说明 |
|------|--------|------|------|
| F1 | 复仇心 | L=无复仇心 → H=强烈复仇 | 被伤害后以牙还牙的驱动力 |
| F2 | 绝望度 | L=从不绝望 → H=容易绝望 | 在绝境中陷入无助和崩溃的倾向 |
| F3 | 执念度 | L=随遇而安 → H=极度执着 | 对信念 / 目标 / 人的偏执程度 |

#### Model B — 羁绊之锁（羁绊维度）

| 编号 | 维度名 | 方向 | 说明 |
|------|--------|------|------|
| B1 | 信任度 | L=封闭 → H=开放 | 向他人敞开心扉、交付信任的容易程度 |
| B2 | 背叛感 | L=不在意 → H=极度敏感 | 被背叛后的情绪反应强度 |
| B3 | 犠牲度 | L=自我优先 → H=甘愿牺牲 | 为他人付出乃至牺牲自身的意愿 |

#### Model W — 因子觉醒（魔女维度）

| 编号 | 维度名 | 方向 | 说明 |
|------|--------|------|------|
| W1 | 压抑力 | L=不压抑 → H=强力压抑 | 抑制内心黑暗面和负面情绪的能力 |
| W2 | 理性力 | L=感性驱动 → H=理性维系 | 在极端情况下保持理性思考的能力 |
| W3 | 本能度 | L=克制 → H=放任 | 放任原始冲动 / 欲望 / 本能的程度 |

### 2.2 维度权重

```
S1 = 1.5  |  S2 = 1.0  |  S3 = 1.0
F1 = 1.5  |  F2 = 1.0  |  F3 = 1.0
B1 = 1.0  |  B2 = 1.0  |  B3 = 1.5
W1 = 1.0  |  W2 = 1.0  |  W3 = 1.5
总权重 = 14.0
```

**权重选取依据：** S1（严厉度）、F1（复仇心）、B3（犠牲度）、W3（本能度）是区分角色的决定性维度，拉高权重使匹配更精准。

### 2.3 分数 → 档位转换

每维度 2 题，每题最高 3 分，总分范围 **2–6**：

| 总分 | 档位 | 数值 |
|------|------|------|
| 2 | L | 0 |
| 3–4 | M | 1 |
| 5 | H | 2 |
| 6 | X | 3 |

---

## 3. 人格类型（角色类型）

共 **16 种**：13 常规角色 + 1 兜底 + 2 特殊。

向量格式：`S1S2S3-F1F2F3-B1B2B3-W1W2W3`

> **⚠️ 内容待定 (TBD)**
> 人格类型（角色列表、向量、标语、描述）将在后续内容重构中确定。
> 代码中使用占位数据，结构已就绪，替换时只需修改 `src/data/quiz-content.ts`。
>
> **数据结构要求：**
> - 常规角色: ~13 种，每项含 `code`, `name`, `group`, `vector`, `slogan`, `desc`, `keywords`
> - 兜底角色: 1 种，向量全 M，触发条件为 Top1/Top2 差 < Δ 且 Top1 < T
> - 特殊角色: 1–3 种，通过 gate+trigger 触发
> - 向量格式: `S1S2S3-F1F2F3-B1B2B3-W1W2W3`（L/M/H/X）
> - 任意两个常规类型向量至少差 3 个维度

---

## 4. 题库

> **⚠️ 内容待定 (TBD)**
> 全部题目文本将在后续内容重构中确定。
> 代码中使用占位题目，结构已就绪，替换时只需修改 `src/data/quiz-content.ts`。
>
> **题目结构要求：**
> - 常规题: 12 维度 × 2 题 = 24 题（第 2 题为反向校验）
> - 每题 3 选项，分值 1/2/3
> - 门控题: 1 题，4 选项（至少 1 个触发路径 + 至少 1 个 normal 路径）
> - 触发题: 1 题，2 选项（仅对门控题选触发路径的用户显示）
> - 总计: 25–26 题
>
> **出题原则：**
> - 用场景而非直接提问（沉浸式监牢/审判情境）
> - 每维度两题从不同角度测
> - 第 2 题做反向校验（措辞方向与第 1 题相反）
>
> **题目顺序规则：**
> - 前 12 题覆盖全部维度（各 1 题）
> - 第 13–17 题为反向校验
> - 第 18 题为门控题（约 2/3 处）
> - 第 19 题为触发题（条件显示）
> - 第 20–26 题补完剩余反向题

---

## 5. 算法规格

### 5.1 匹配流程

```
用户提交所有答案
       │
       ▼
  ① 检查特殊触发
     trigger 标记 == "YUKI" 或 "ETL" ?
     YES → 直接返回对应特殊角色, 相似度 100%
       │ NO
       ▼
  ② 计算用户向量
     每维度: sum(optionScores) → 分档 (L/M/H/X)
     门控题 normal 选项额外微调: S2+1 或 W1+1
       │
       ▼
  ③ 向量匹配
     对每个常规角色模板计算加权曼哈顿距离
     按距离排序 → 取 Top 3
       │
       ▼
  ④ 边界检查
     Δ = 8%, T = 55%
     Top1 与 Top2 差 < Δ ?
       YES + Top1 < T → 返回 UNSET (兜底)
       YES + Top1 ≥ T → 返回 Top1, 标记 "边界型"
       NO → 返回 Top1
       │
       ▼
  ⑤ 输出
     {
       code: "HIRO",
       name: "二阶堂希罗",
       similarity: 89.3,
       slogan: "...",
       desc: "...",
       vector: { user: "HML-MML-LHH-HHM", template: "HLL-HMH-LHH-HHM" },
       top3: [
         { code: "HIRO", name: "二阶堂希罗", similarity: 89.3 },
         { code: "SHERRY", name: "橘雪莉", similarity: 81.2 },
         { code: "HANNA", name: "远野汉娜", similarity: 76.8 }
       ],
       group: "F",
       borderType: false,
       special: false
     }
```

### 5.2 公式

**加权曼哈顿距离：**

```
D(user, template) = Σᵢ wᵢ × |uᵢ - tᵢ|    (i = 0..11)

wᵢ = 第 i 维权重 (1.0 或 1.5)
uᵢ = 用户第 i 维的档位数值 (0/1/2/3)
tᵢ = 角色模板第 i 维的档位数值 (0/1/2/3)

maxDist = Σᵢ wᵢ × 3 = 42.0
```

**相似度：**

```
similarity = (1 - D / maxDist) × 100%
```

**参数：**

```
Δ = 8%     Top1/Top2 相似度差距阈值
T = 55%    兜底相似度下限
```

### 5.3 门控题微调规则

当用户选择 `normal` 路径（选项 C 或 D）时，在向量匹配前对用户原始分数进行微调：

- 选 C（改写记忆）: S2 维度总分 +1（上限 6）
- 选 D（砸权杖）: W1 维度总分 +1（上限 6）

此微调仅影响向量匹配，不影响特殊触发。

---

## 6. 数据模型

### 6.1 ER 关系

```
Question ──< Option           (1:N)
PersonalityType               (独立表)
TestRecord ──< Answer         (1:N)
TestRecord ──> PersonalityType (关联 resultCode)
```

### 6.2 表结构

**Question**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO | 自增主键 |
| dim | VARCHAR(4) | 维度代码，如 `"S1"`, `"F2"`, `"GATE"`, `"TRIGGER"` |
| text | TEXT | 题目文本 |
| order | INT | 显示顺序 (1–26) |
| type | VARCHAR(10) | `"normal"` / `"gate"` / `"trigger"` |

**Option**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO | 自增主键 |
| questionId | INT FK | 关联 Question.id |
| label | TEXT | 选项文本 |
| score | INT DEFAULT 0 | 常规题: 1/2/3 |
| value | VARCHAR NULL | 门控题: `"destroy"` / `"endure"` / `"normal"` |
| trigger | VARCHAR NULL | 触发题: `"YUKI"` / `"ETL"` |

**PersonalityType**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO | 自增主键 |
| code | VARCHAR UNIQUE | `"EMMA"`, `"HIRO"` 等 |
| name | VARCHAR | 角色全名 |
| subtitle | VARCHAR NULL | 副标题，如 `"大魔女"` |
| group | VARCHAR | `"B"` / `"F"` / `"S"` / `"W"` / `"mixed"` / `"fallback"` / `"special"` |
| vector | VARCHAR | `"LHH-LLM-HHH-LLL"` |
| slogan | TEXT | 角色标语 |
| desc | TEXT | 角色描述 |
| keywords | VARCHAR NULL | 逗号分隔关键词 |
| special | BOOLEAN DEFAULT FALSE | 是否特殊类型 |

**TestRecord**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO | 自增主键 |
| sessionId | VARCHAR | 匿名会话 ID |
| resultCode | VARCHAR FK | 匹配到的角色 code |
| similarity | FLOAT | Top1 相似度 |
| userVector | VARCHAR | 用户向量字符串 |
| top3 | TEXT | JSON: `[{code,similarity}]` |
| borderType | BOOLEAN DEFAULT FALSE | 是否边界型 |
| gateValue | VARCHAR NULL | 门控题选择 |
| triggerFired | VARCHAR NULL | 触发的特殊类型 code |
| createdAt | TIMESTAMP | 创建时间 |

**Answer**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK AUTO | 自增主键 |
| recordId | INT FK | 关联 TestRecord.id |
| questionId | INT FK | 关联 Question.id |
| optionId | INT FK | 关联 Option.id |

---

## 7. API 规格

### 7.1 GET /api/quiz

获取全部题目和角色模板。

**Response:**

```json
{
  "questions": [
    {
      "id": 1,
      "dim": "S1",
      "text": "审判台上，一名少女哭着说她是被逼的...",
      "order": 1,
      "type": "normal",
      "options": [
        { "id": 1, "label": "眼泪不能洗清血迹...", "score": 3 },
        { "id": 2, "label": "先冷静下来...", "score": 2 },
        { "id": 3, "label": "……也许她真的有苦衷", "score": 1 }
      ]
    }
  ],
  "types": [
    {
      "code": "EMMA",
      "name": "樱羽艾玛",
      "group": "B",
      "vector": "LHH-LLM-HHH-LLL",
      "slogan": "即使全世界都放弃了，我也不会",
      "desc": "..."
    }
  ],
  "dimensions": [
    { "code": "S1", "name": "严厉度", "model": "S", "model_name": "罪业之秤" }
  ]
}
```

### 7.2 POST /api/match

提交答题数据，返回匹配结果。

**Request:**

```json
{
  "answers": [
    { "questionId": 1, "optionId": 3 }
  ]
}
```

**Response:**

```json
{
  "code": "HIRO",
  "name": "二阶堂希罗",
  "subtitle": null,
  "slogan": "哪怕要死一千次，我也要把她带回来",
  "desc": "你是冰与火的矛盾体...",
  "keywords": "冷焰、死亡回溯、为挚爱不惜一切",
  "similarity": 89.3,
  "userVector": "HML-MML-LHH-HHM",
  "templateVector": "HLL-HMH-LHH-HHM",
  "top3": [
    { "code": "HIRO", "name": "二阶堂希罗", "similarity": 89.3 },
    { "code": "SHERRY", "name": "橘雪莉", "similarity": 81.2 },
    { "code": "HANNA", "name": "远野汉娜", "similarity": 76.8 }
  ],
  "group": "F",
  "borderType": false,
  "special": false
}
```

### 7.3 POST /api/results

保存测试记录，返回群体定位数据。

**Request:**

```json
{
  "sessionId": "anon-xxx",
  "resultCode": "HIRO",
  "similarity": 89.3,
  "userVector": "HML-MML-LHH-HHM",
  "top3": [...],
  "borderType": false,
  "answers": [
    { "questionId": 1, "optionId": 3 }
  ]
}
```

**Response:**

```json
{
  "rank": 5,
  "totalParticipants": 1234,
  "typeCount": 42,
  "typePercentage": 3.4,
  "message": "你是第 42 位被判定为「二阶堂希罗」的被审判者，全球只有 3.4% 的人和你一样"
}
```

---

## 8. UI/UX 规格

### 8.1 整体视觉

**配色变量：**

```css
:root {
  --bg:       #0a0612;    /* 深紫黑 — 魔女之夜 */
  --bg-card:  #1a1028;    /* 卡片底色 */
  --accent:   #8b5cf6;    /* 幽紫 — 魔力之光 */
  --accent-2: #a78bfa;    /* 浅紫 */
  --warm:     #f59e0b;    /* 暗金 — 审判之秤 */
  --text:     #e2e8f0;    /* 银白 */
  --text-2:   #94a3b8;    /* 灰蓝 */
  --text-3:   #64748b;    /* 暗灰蓝 */
  --danger:   #ef4444;    /* 血红 — 处刑标记 */
  --hope:     #38bdf8;    /* 冰蓝 — 希望之光 */
}
```

**维度条配色：**

```css
.dim-x  { background: #8b5cf6; }  /* 幽紫 */
.dim-h  { background: #a78bfa; }  /* 浅紫 */
.dim-m  { background: #64748b; }  /* 灰蓝 */
.dim-l  { background: #334155; }  /* 暗灰 */
```

**字体：**

```
正文:   Noto Sans SC (Google Fonts, weight 400/700)
装饰:   Cinzel (衬线哥特, 用于数字/标题装饰)
```

**卡片风格：** 毛玻璃态

```css
.card {
  background: rgba(26, 16, 40, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 16px;
}
```

**背景效果：** Canvas 绘制缓慢旋转的魔法阵纹 + 漂浮粒子。

### 8.2 三屏结构

应用为**单页面三屏切换**，通过 React state 控制当前显示屏幕。不使用 URL 路由。

#### Screen 1: WelcomeScreen（欢迎屏）

```
┌─────────────────────────────────────┐
│                                     │
│         [缓慢旋转的魔法阵]           │
│                                     │
│         「魔女审判」                 │
│     你的灵魂将被如何裁决？           │
│                                     │
│  ─────────────────────────────────  │
│  你在一间陌生的房间中醒来。          │
│  身边还有十二个陌生的少女。          │
│  典狱长的声音从天花板传来——         │
│  "欢迎来到魔女审判。"               │
│  ─────────────────────────────────  │
│                                     │
│         [ 接受审判 ]                │
│        (hover 发光效果)             │
│                                     │
└─────────────────────────────────────┘
```

**组件要点：**
- 标题使用 Cinzel 字体 + 紫色发光文字阴影
- 故事引言使用 `text-2` 颜色，斜体
- 按钮默认 `accent` 色，hover 时 scale(1.02) + box-shadow 紫色光晕
- 进入时有 fade-in 动画

#### Screen 2: TestScreen（答题屏）

```
┌─────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  47%        │  ← 进度条 (accent → warm 渐变)
├─────────────────────────────────────┤
│                                     │
│   第 7 审问 / 共 26                 │
│                                     │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │  你发现最好的朋友一直在偷偷 │   │
│   │  向典狱长汇报你们的行动。   │   │
│   │  她说她是为了保护你。       │   │
│   │                             │   │
│   └─────────────────────────────┘   │  ← 毛玻璃卡片
│                                     │
│   ┌─────────────────────────────┐   │
│   │ 「心像被人用刀剜了一块出来」│   │  ← 选项 A (hover 高亮)
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │ 「愤怒和悲伤同时涌上来…」   │   │  ← 选项 B
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │ 「每个人都有自己的立场…」   │   │  ← 选项 C
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**组件要点：**
- 进度条: `height: 4px`, 渐变从 `accent` 到 `warm`, 底部显示百分比
- 题目卡片: `max-width: 640px`, 居中
- 选项: 纵向排列，默认半透明边框，hover 时 `accent` 色边框 + 微微上浮
- 选中后: 选项卡片发光 + scale 动画 → 300ms 后自动切换下一题
- 题目切换: framer-motion `AnimatePresence` + fade/slide
- 门控题有 4 个选项，触发题有 2 个选项
- 触发题条件渲染: 仅门控题选 A 或 B 时显示
- **进度恢复**: 当前题目索引 + 已选答案存入 localStorage, 页面刷新后恢复

#### Screen 3: ResultScreen（结果屏）

```
┌─────────────────────────────────────┐
│                                     │
│           「审 判 结 果」            │  ← Cinzel 字体
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │  二阶堂希罗    │           │  ← 角色名 (大号, accent 色)
│         │    HIRO       │           │  ← 代码 (装饰字体)
│         │               │           │
│         └───────────────┘           │
│                                     │
│   「哪怕要死一千次，                │
│     我也要把她带回来」              │  ← 标语 (斜体)
│                                     │
│   你是冰与火的矛盾体——外表冷酷     │
│   无情，内心却燃烧着比任何人都      │  ← 描述
│   炽热的情感……                      │
│                                     │
│   ──── 维度分析 ────                │
│                                     │
│   罪业之秤                          │
│   严厉度  ▓▓▓▓▓▓▓░░░ H             │
│   直觉度  ▓▓░░░░░░░░ L             │
│   宽恕度  ▓▓░░░░░░░░ L             │
│                                     │
│   堕落之翼                          │
│   复仇心  ▓▓▓▓▓▓▓▓░ H             │
│   ...                               │
│                                     │
│   ──── 相似角色 ────                │
│   #2 橘雪莉  81.2%                  │
│   #3 远野汉娜 76.8%                 │
│                                     │
│   全球只有 3.4% 的被审判者          │  ← 群体定位
│   被判定为此角色                     │
│                                     │
│   [复制链接]  [重新审判]            │
│                                     │
└─────────────────────────────────────┘
```

**组件要点：**
- 页面进入: 粒子爆发动画 → 卡片淡入
- 角色名: `text-4xl font-bold`, `accent` 色, Cinzel
- 标语: `text-lg italic`, `text-2` 色
- 描述: `text-base`, `text` 色, 行距 `leading-relaxed`
- 维度条: 横向进度条，按模型分组，每组标题显示模型名
  - 用户维度条: 实色填充（按档位配色）
  - 角色模板维度条: 虚线边框叠加，便于对比
- Top 3: 纵向列表，显示排名 + 角色名 + 相似度百分比
- 群体定位: 单行文字，`warm` 色高亮数字
- 分享按钮: 复制链接到剪贴板，点击后显示 "已复制"
- 重新审判: 清除 localStorage, 回到 WelcomeScreen

### 8.3 响应式

```
移动端 (< 640px):
  - 题目卡片 padding 缩小
  - 选项文字 size 14px
  - 维度条紧凑模式
  - 结果页角色名 text-3xl

桌面端 (≥ 640px):
  - 题目卡片 max-width 640px 居中
  - 选项文字 size 16px
  - 维度条宽松模式
  - 结果页角色名 text-4xl
```

### 8.4 动画规格

| 元素 | 动画 | 时长 | 库 |
|------|------|------|-----|
| 背景魔法阵 | 缓慢旋转 (360°) | 60s 循环 | Canvas / CSS |
| 背景粒子 | 随机漂浮上升 | 持续 | Canvas |
| 欢迎屏进入 | fade-in + scale(0.95→1) | 800ms | Framer Motion |
| 题目切换 | fade + translate-x(20px) | 300ms | Framer Motion |
| 选项选中 | border-glow + scale(1.02) | 200ms | CSS transition |
| 结果揭示 | 粒子爆发 + fade-in | 1200ms | Framer Motion |
| 维度条填充 | width 从 0 展开 | 600ms, stagger 100ms | Framer Motion |
| 按钮悬停 | box-shadow 紫色光晕 | 200ms | CSS transition |

---

## 9. 技术架构

### 9.1 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 14+ (App Router) + React 18+ + TypeScript |
| 样式 | Tailwind CSS 3+ + CSS Variables |
| UI 组件 | shadcn/ui (Button, Card, Progress) |
| 动画 | Framer Motion 11+ |
| 数据库 | Prisma + SQLite (开发/轻量部署) |
| 部署 | Docker 多阶段构建 |

### 9.2 文件结构

```
mfsn-qute/
├── prisma/
│   ├── schema.prisma           # 数据模型定义
│   └── seed.ts                 # 数据库种子脚本
├── src/
│   ├── app/
│   │   ├── globals.css         # Tailwind + CSS 变量 + 自定义动画
│   │   ├── layout.tsx          # 根布局 (字体加载, metadata)
│   │   ├── page.tsx            # 主页面 (三屏状态路由)
│   │   └── api/
│   │       ├── quiz/
│   │       │   └── route.ts    # GET: 返回题目+角色模板+维度
│   │       ├── match/
│   │       │   └── route.ts    # POST: 答题数据 → 匹配结果
│   │       └── results/
│   │           └── route.ts    # POST: 保存记录 → 群体定位
│   ├── components/
│   │   ├── BackgroundEffect.tsx # Canvas 魔法阵粒子背景
│   │   ├── DimensionBar.tsx     # 维度条可视化组件
│   │   ├── WelcomeScreen.tsx    # 欢迎屏
│   │   ├── TestScreen.tsx       # 答题屏
│   │   └── ResultScreen.tsx     # 结果屏
│   ├── data/
│   │   └── quiz-content.ts     # 全部内容数据 (维度/角色/题目)
│   └── lib/
│       ├── db.ts               # Prisma 客户端单例
│       └── match.ts            # 匹配算法 (分数→向量→距离→判定)
├── Dockerfile                   # 多阶段构建
├── docker-compose.yml
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

### 9.3 关键实现约束

1. **匹配算法必须在后端执行** (`/api/match`)，前端只做展示
2. **答题明细存 Answer 表**，不要 JSON 字段
3. **进度恢复使用 localStorage**，存储 `{ currentIndex, answers[] }`
4. **所有文字内容集中在** `data/quiz-content.ts`，方便修改
5. **不使用 SSR 渲染题目内容**，全部客户端渲染（避免首屏闪烁）

---

## 10. 检查清单

### 内容完整性

- [ ] 12 维度各 2 题 = 24 题 (TBD)
- [ ] 每题 3 选项覆盖低/中/高分 (TBD)
- [ ] 角色向量两两至少差 3 维度 (TBD)
- [ ] 门控题至少 1 条触发路径可走通 (TBD)
- [ ] 每维度第 2 题为反向校验 (TBD)

### 算法合理性

- [ ] 权重总和 > 0, 无负值 ✓ (14.0)
- [ ] maxDist 计算正确 (42.0)
- [ ] Δ 和 T 参数已用测试数据校准
- [ ] 边界型标记不影响正常匹配结果

### 用户体验

- [ ] 答题进度可恢复 (localStorage)
- [ ] 群体定位数据可返回 (排名/占比)
- [ ] 移动端适配
- [ ] 分享功能 (复制链接)

### 工程

- [ ] 匹配在后端 `/api/match`
- [ ] 前端组件按屏幕拆分 (Welcome/Test/Result)
- [ ] Docker 构建含数据库初始化
- [ ] 内容数据集中管理 (quiz-content.ts)
