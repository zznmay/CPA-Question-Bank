# CPA 统一题库框架

面向注册会计师专业阶段六科（会计、审计、财管、税法、经济法、战略）的纯静态题库系统框架。参考既有「CPA 经济法在线题库」的交互与数据结构重构，核心目标是：**新增科目、补充题目、调整试卷结构时，不需要改动练习与测试逻辑**。

> 当前版本为 **框架版 v0.3**：六科章节结构、题目录入、练习、随机抽题、限时测试、主观题自评与成绩记录均已打通；会计科目第一章已录入 2026 年《轻一会计（上册）》同步习题 15 道（8 单选 + 7 多选）与《轻二会计（上册）》第一章题目 15 道（7 单选 + 8 多选），均含答案、逐选项解析与知识点说明，其余内容为明确标注的「框架占位题」，可通过界面或数据文件逐步替换为正式题目。

---

## 快速开始

无需安装依赖、无需构建。

```bash
# 方式一：直接打开
open index.html

# 方式二：本地静态服务（推荐）
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000
```

所有数据保存在浏览器 `localStorage`，右上角「数据管理」可整包导出/导入 JSON。

---

## 目录结构

```
.
├── index.html                  # 入口，按顺序加载核心脚本
├── assets/
│   └── app.css                 # 设计系统与全部页面样式（无外部 CDN）
├── js/
│   ├── app.js                  # 外壳、路由调度、数据管理弹窗
│   ├── core/
│   │   ├── utils.js            # DOM/转义/时间/下载/Toast 等工具
│   │   ├── registry.js         # 科目注册、题目规范化、校验、统计
│   │   ├── store.js            # localStorage：进度/测试/自建题
│   │   ├── exam.js             # 抽题、组卷、判分引擎
│   │   └── router.js           # hash 路由
│   └── views/
│       ├── home.js             # 首页六科入口
│       ├── practice.js         # 章节/知识点/错题/薄弱/随机练习
│       ├── test.js             # 测试中心、限时考试、成绩、回顾
│       └── entry.js            # 题目表单、批量导入、自建题管理
├── data/
│   ├── manifest.js             # 科目数据文件清单（新增科目在此登记）
│   └── subjects/
│       ├── accounting.js       # 会计：章节骨架 + 第一章轻一/轻二习题 + 试卷蓝图
│       ├── audit.js            # 审计
│       ├── finance.js          # 财管
│       ├── tax.js              # 税法
│       ├── econ-law.js         # 经济法（复用既有题库的章/知识点骨架）
│       └── strategy.js         # 战略
├── tools/
│   └── qa-data.js              # 题库数据校验脚本（node tools/qa-data.js）
├── CONTRIBUTING.md             # 版本控制范围、提交粒度与维护约定
├── .gitignore                  # Git 忽略规则
└── .gitattributes              # 换行符与二进制属性
```

---

## 已实现功能

### 科目与内容

- 六科统一入口，科目卡片展示章数、题量、进度、正确率。
- 章节 → 知识点两级导航，每科独立维护章节、题型、试卷蓝图与颜色。
- 题型体系：单选、多选、案例分析、计算分析、简答、综合；科目可按需声明与命名。
- 占位题自动生成并清晰标注，用于在正式内容补齐前验证完整流程。
- 数据文件中已包含正式题目的章节，在加载时不会再生成占位题（会计第一章已按此规则接入 2026 年轻一同步习题与轻二第一章题目）。
- 自建题保存后立即进入练习、随机抽题与组卷。

### 练习

- 全部 / 章节 / 知识点 / 错题本 / 薄弱题。
- 顺序或随机顺序；随机练习支持章节多选、按题型设置数量。
- 抽题优先级：**未做 > 真题 > 错题**，不足时从其余题目补足。
- 选择题即时判分、逐选项解析、考点与记忆提示。
- 主观题可填写作答、逐问展开参考答案、标记薄弱；主观题按「已查看参考答案」计入完成。
- 键盘快捷键：`A–F` 选项、`Enter` 提交、`←/→` 切题。

### 测试

- **快速自测**：自选章节、单选/多选/主观题数量、限时。
- **全真模拟**：按科目试卷蓝图组卷；题目不足时自动按可用题量组卷并提示。
- 限时倒计时、答题卡、自动保存、超时自动交卷、中途退出可恢复。
- 客观题自动判分；主观题交卷后按参考答案自评，自评分数计入总分与及格判断。
- 成绩单含分项成绩、客观题正确率；逐题回顾显示作答、正确答案、解析与参考答案。
- 测试记录保存在本机，最多保留 40 条。

### 数据

- 全部数据存于 `localStorage`（键名 `cpa-unified-bank-v1`）。
- 支持整体导出/导入备份；导入按时间戳合并，较新的记录优先。
- 支持按科目清空答题记录、重置全部学习进度（自建题保留）。
- 支持导出自建题 JSON。

---

## 数据结构

### 科目定义

```js
CPA.registerSubject({
  id: "your-subject",              // 小写字母/数字/短横线，路由使用
  name: "科目名",
  fullName: "CPA《科目名》",
  tagline: "一句话介绍",
  accent: "#0f766e",               // 全站主色，自动应用
  icon: "科",                      // 科目图标字
  typeLabels: { case: "案例分析题" }, // 可覆盖默认题型名称
  questionTypes: ["single", "multiple", "case"],
  exam: {
    duration: 120,
    passScore: 60,
    sections: [
      { name: "一、单项选择题", type: "single", count: 20, scorePer: 1 },
      { name: "二、多项选择题", type: "multiple", count: 10, scorePer: 2 },
      { name: "三、案例分析题", type: "case", count: 4, scorePer: 15 }
    ]
  },
  placeholderProfile: {            // 正式题库补齐后可删除；已含正式题的章节自动跳过
    singlesPerChapter: 2,
    multiplesPerChapter: 2,
    subjectives: { case: 5 }
  },
  chapters: CPA.defineChapters([
    ["ch1", "第一章 总论", ["核心考点", "综合应用"]],
    ["ch2", "第二章 进阶", ["考点一", "考点二"]]
  ])
});
```

`CPA.defineChapters` 会把 `["ch1", "第一章 总论", ["核心考点"]]` 展开为：

```js
{
  id: "ch1",
  name: "第一章 总论",
  knowledgePoints: [
    { id: "ch1-k1", name: "核心考点", questions: [] }
  ]
}
```

也可直接写完整的 `chapters` 对象，或给章节设置 `questions`（自动归入「本章综合」知识点）。

### 题目

选择题：

```js
{
  type: "single",                  // single | multiple
  chapterId: "ch1",
  kpId: "ch1-k1",
  stem: "下列各项中，说法正确的是（ ）。",
  options: [                       // 也可写 "A. 内容" 字符串
    { key: "A", text: "选项 A" },
    { key: "B", text: "选项 B" },
    { key: "C", text: "选项 C" },
    { key: "D", text: "选项 D" }
  ],
  answer: "A",                     // 单选单字母；多选可写 ["A","C"]
  analysis: "详细解析……",
  optionAnalysis: {                 // 选填
    A: "√ 正确：……",
    B: "× 错在：……"
  },
  knowledgePoint: "考点说明",
  tip: "口诀 / 记忆技巧",
  year: 2026,                      // 选填
  source: "2026 真题 / 自编",
  score: 0
}
```

主观题：

```js
{
  type: "case",                    // case | calculation | short | comprehensive
  chapterId: "ch1",
  kpId: "ch1-k1",
  stem: "案例背景 / 材料……",
  subs: [                          // 也兼容 subQuestions
    { prompt: "第（1）问……", answer: "参考答案……", analysis: "评分要点……" }
  ],
  analysis: "整体解析（选填）",
  knowledgePoint: "考点说明",
  score: 13,
  source: "自编"
}
```

字段兼容说明：

- `options` 支持 `"A. 内容"` 字符串，自动解析字母。
- `answer` 支持 `"A"`、`"A,B"`、`["A","B"]`。
- 主观题子问兼容 `subQuestions`。
- `knowledgePoint` 是题目的考点说明文本，与 `kpId` 归属互不冲突。
- 题目 ID 缺省时按「章节-知识点-序号」生成；同一科目内必须唯一。

### 试卷蓝图

`exam.sections` 定义全真模拟的题型、题量与每题分值：

- 组卷时按题型从当前题库抽题（优先未做/真题/错题），不会超出可用量。
- 实际题量不足时，结果页按「实际题量」计算得分率，并在测试中心提示。
- 快速自测使用独立的数量配置，分值权重为单选 2 / 多选 3 / 主观 12（示例权重）。

---

## 扩展指南

### 新增科目

1. 在 `data/subjects/` 新建数据文件，调用 `CPA.registerSubject({...})`。
2. 在 `data/manifest.js` 的 `CPA_SUBJECT_FILES` 中追加文件路径。
3. 刷新页面即可；首页、练习、测试、录入、进度自动适配，无需修改核心代码。

### 补充正式题目

三种方式，按数据量选择：

1. **表单录入**：科目页 →「录入题目」 → 新建题目；保存后立即生效，数据在本机。
2. **批量导入**：科目页 →「录入题目」 →「批量导入」，粘贴 JSON 或选择文件；逐题校验后入库。
3. **数据文件**（推荐用于正式题库、可版本管理）：在科目数据文件的 `chapters[].knowledgePoints[].questions` 中直接写题，或在文件末尾调用：

```js
CPA.registerQuestions("econ-law", [
  {
    type: "single",
    chapterId: "ch1",
    kpId: "ch1-k1",
    stem: "……",
    options: ["A. ……", "B. ……", "C. ……", "D. ……"],
    answer: "A",
    analysis: "……"
  }
]);
```

### 迁移既有经济法题库

既有系统的 `BANK`（章 → `knowledgePoints` → `questions`）可直接适配：

```js
BANK.forEach(ch => ch.knowledgePoints.forEach(kp => {
  CPA.registerQuestions("econ-law", kp.questions.map(q => Object.assign({}, q, {
    chapterId: ch.id,
    kpId: kp.id
  })));
}));
```

`normalizeQuestion` 已兼容既有字段：选项 `"A. 内容"`、答案字母/数组、主观题 `subQuestions`、`optionAnalysis`、`tip` 等。迁移时可删除 `econ-law.js` 中的 `placeholderProfile`，避免与正式题重复。

### 调整章节或试卷结构

直接编辑对应 `data/subjects/*.js`：

- 章/知识点：修改 `CPA.defineChapters([...])`。
- 全真模拟题量/分值：修改 `exam.sections`。
- 题型名称：修改 `typeLabels`（如税法「计算问答题」）。
- 占位题数量：修改 `placeholderProfile`；正式题库补齐后移除。

> 非经济法科目的章节名为框架示例，建议按当年考试大纲校对后使用。

---

## 数据与存储

| 键名 | 内容 |
| --- | --- |
| `cpa-unified-bank-v1` | 六科进度、测试记录、自建题目、上次访问科目 |

- 答题记录按科目隔离，结构化存储为 `progress[subjectId][questionId]`。
- 章节练习进度与测试记录分别存储、互不影响；测试成绩不会自动改写错题本。
- 测试记录包含会话 ID、试卷结构、作答、自评分数、提交时间、状态。
- 排行榜/账号/云同步未实现；跨设备请使用「数据管理 → 导出/导入」。
- 清除浏览器数据会丢失本机进度，建议定期导出备份。

---

## 技术说明

- 原生 HTML/CSS/JavaScript，无框架、无构建、无 CDN 依赖。
- 科目数据通过 `data/manifest.js` 动态注入 `<script>` 加载，`file://` 或静态服务器均可工作。
- hash 路由：首页 `#/`、练习 `#/s/:subjectId/practice`、测试中心 `#/s/:subjectId/test`、考试/成绩 `#/s/:subjectId/test/:testId`、录入 `#/s/:subjectId/entry`。
- 移动端：章节导航为抽屉，答题卡可折叠，题号导航横向滚动。
- 题号导航在超过 240 题时自动窗口化（显示当前附近的 120 个题号），并提供题号跳转，避免大题库一次渲染全部按钮。
- 无障碍：按钮语义、键盘操作、`aria` 标签与 `prefers-reduced-motion` 支持。

---

## 版本管理

项目已按 Git 版本管理方式整理，可直接作为 GitHub 仓库使用：

- **纳入范围**：源码（`index.html`、`assets/`、`js/`）、题库数据（`data/`）、校验脚本（`tools/`）、文档（`README.md`、`CONTRIBUTING.md`）。
- **排除范围**：教材 PDF 原件与 OCR 中间产物、`localStorage` 导出备份、编辑器与系统垃圾文件、任何密钥文件——规则见 [.gitignore](.gitignore)。
- **提交粒度**：一次提交只做一件事；题库数据按「科目 + 章节 + 来源」分批提交；代码、数据、文档、格式改动不混提。
- **提交信息**：`<type>(<scope>): <简短中文标题>`，如 `feat(会计): 录入第一章《轻二会计（上册）》题目与解析`。
- **提交前自检**：`node tools/qa-data.js` 校验题目 id 唯一、答案与选项一致、解析与知识点齐全。

完整约定（分支模型、发布与标签、日常流程、版权与隐私提醒）见 [CONTRIBUTING.md](CONTRIBUTING.md)。

> 题库内容来自教材与考试资料整理，属于版权材料，建议将远程仓库设为 **Private**，或仅推送代码框架。

---

## 后续建议

1. 逐科校对章节与知识点，替换为非经济法科目的正式结构。
2. 参照会计科目第一章的做法，将现有经济法真题/试卷迁移进 `data/subjects/econ-law.js`，移除对应占位题。
3. 按科目补充正式题目后，调整 `exam.sections` 至当年考试结构。
4. 当前测试以「蓝图自动组卷」为主；如需固化某套真题整卷，可在现有考试引擎上增加固定试卷数据与入口。
5. 如需多端同步，可复用旧系统的 GitHub Gist 方案，或接入正式后端；当前数据层已与 UI 解耦，便于替换存储实现。
