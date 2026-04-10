# WorkflowHub — 技能完整技术文档

> 本文档是对 `workflow-hub` 技能所有逻辑和技术的完整说明。

---

## 目录

1. [技能概述](#1-技能概述)
2. [文件结构](#2-文件结构)
3. [核心数据模型](#3-核心数据模型)
4. [匹配算法详解](#4-匹配算法详解)
5. [四个脚本工具详解](#5-四个脚本工具详解)
6. [本地 UI 详解](#6-本地-ui-详解)
7. [对话流程（Agent 行为）](#7-对话流程agent-行为)
8. [Workflow 生命周期](#8-workflow-生命周期)
9. [存储策略](#9-存储策略)
10. [启动与运行](#10-启动与运行)

---

## 1. 技能概述

**WorkflowHub** 是一个将用户重复性工作流程（Workflow / SOP）保存为本地 JSON 文件库的技能。

核心设计原则：

- **文件即真相**：所有 workflow 以 JSON 文件形式存储，技能和 UI 共享同一套文件
- **按需复用**：任务执行前主动匹配已有 workflow，高置信度时询问用户是否复用
- **轻量可编辑**：文件结构简单，可手动编辑、可 diff、可脚本操作
- **对话感知**：在正常对话中自动完成匹配和保存，不需要用户手动触发

---

## 2. 文件结构

```
work-style-memory/
├── SKILL.md                          # 技能主说明文档
├── agents/
│   └── openai.yaml                   # Agent 接口配置（display_name、default_prompt、policy）
├── assets/
│   └── workflow-template.json       # 新建 workflow 的默认模板
├── references/
│   ├── workflow-schema.md            # Workflow JSON schema 规范
│   ├── runtime-behavior.md           # Agent 在对话中的行为规范
│   └── local-ui-spec.md              # 本地 UI 产品规格说明
├── scripts/
│   ├── workflow_engine.py            # ⭐ 核心引擎：匹配、评分、渲染
│   ├── match_workflows.py             # CLI 入口：匹配 workflow
│   ├── capture_workflow.py            # CLI 入口：从任务描述生成 workflow 草稿
│   ├── new_workflow.py                # CLI 入口：创建空白 workflow 文件
│   ├── save_workflow.py               # CLI 入口：保存或更新 workflow
│   └── render_workflow_prompt.py      # CLI 入口：将 workflow 渲染为执行摘要
└── ui/
    ├── server.py                     # ⭐ 本地 HTTP 服务器（ThreadingHTTPServer）
    ├── static/
    │   ├── index.html                 # UI 页面结构
    │   ├── app.js                     # UI 前端逻辑
    │   └── styles.css                 # UI 样式（暖色调，羊皮纸风格）
```

---

## 3. 核心数据模型

### 3.1 Workflow JSON Schema

每个 workflow 存储为单个 JSON 文件，文件名格式为 `<id>.json`。

```json
{
  "id": "pr-review",
  "name": "PR Review",
  "summary": "Review pull requests with a risk-first pass and short final summary.",
  "match": {
    "keywords": ["pr", "review", "diff", "patch"]
  },
  "steps": [
    {
      "id": "step-1",
      "title": "Fetch change context",
      "instruction": "Load the PR, changed files, and recent comments."
    },
    {
      "id": "step-2",
      "title": "Inspect risk and regressions",
      "instruction": "Prioritize behavior changes, hidden coupling, and missing tests."
    },
    {
      "id": "step-3",
      "title": "Draft review output",
      "instruction": "Present findings first, then open questions, then a short summary."
    }
  ],
  "tool_preferences": [
    {
      "tool": "github",
      "purpose": "Load PR metadata and comments"
    },
    {
      "tool": "git",
      "purpose": "Inspect diffs and local code context"
    }
  ],
  "version": 1
}
```

### 3.2 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 机器友好的唯一标识，小写 kebab-case |
| `name` | string | 人类可读标题，UI 中显示 |
| `summary` | string | 一句话描述 workflow 用途 |
| `match.keywords` | string[] | 触发匹配的关键词列表 |
| `steps` | object[] | 有序步骤列表 |
| `steps[].id` | string | 自动生成的步骤 ID |
| `steps[].title` | string | 步骤标题 |
| `steps[].instruction` | string | 步骤执行指令 |
| `tool_preferences` | object[] | 偏好工具列表 |
| `tool_preferences[].tool` | string | 工具名称 |
| `tool_preferences[].purpose` | string | 工具用途说明 |
| `version` | int | 模式版本号，每次更新 +1 |

---

## 4. 匹配算法详解

### 4.1 评分函数 `score_workflow()`

对每个 workflow 从四个维度计算加权得分：

```
total = (0.55 × keyword_score) + (0.20 × name_score) + (0.10 × summary_score) + (0.15 × tool_score)
```

#### 维度 1：Keyword 重叠（权重 55%）

从任务描述中提取 token，与 workflow 的 `match.keywords` 集合求交集：

```
keyword_score = |task_tokens ∩ workflow_keywords| / |workflow_keywords|
```

#### 维度 2：Name 重叠（权重 20%）

从任务描述 token 与 workflow `name` token 的交集：

```
name_score = |task_tokens ∩ name_tokens| / |name_tokens|   (仅在 name_tokens 非空时)
```

#### 维度 3：Summary 重叠（权重 10%）

与 `summary` 字段的 token 交集：

```
summary_score = |task_tokens ∩ summary_tokens| / |summary_tokens|   (仅在 summary_tokens 非空时)
```

#### 维度 4：Tool 重叠（权重 15%）

任务使用的工具与 workflow `tool_preferences` 中工具的交集：

```
tool_score = |task_tools ∩ workflow_tools| / |workflow_tools|   (两者均非空时)
```

### 4.2 关键词提取 `extract_keywords()`

从文本中提取最多 12 个关键词 token：

1. **分词**：正则 `r"[a-z0-9]+"` 提取所有小写字母数字片段
2. **去停用词**：移除常见无意义词（a, an, and, the, I, me, my, do, for... 共 41 个）
3. **按频次排序**：高频词优先
4. **去重并取前 12 个**

```python
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "build", "by",
    "can", "do", "for", "from", "help", "how", "i", "in", "into",
    "is", "it", "make", "me", "my", "need", "of", "on", "or",
    "please", "should", "something", "task", "that", "the",
    "this", "to", "use", "want", "we", "with"
}
```

### 4.3 匹配阈值

- **高置信度阈值：0.55**
- 只有最高分 ≥ 0.55 时，Agent 才会主动询问用户是否复用
- 若最高分 < 0.55，不触发询问，当作无匹配处理

### 4.4 匹配流程

```
1. 对当前任务提取关键词（tokenize + 去停用词）→ task_tokens
2. 遍历 workflows_dir 下所有 *.json 文件
3. 对每个 workflow 调用 score_workflow()
4. 过滤 score = 0 的结果
5. 按 score 降序排列，返回 top N（默认 3）
```

### 4.5 匹配结果结构

```json
{
  "workflow_id": "pr-review",
  "name": "PR Review",
  "score": 0.632,
  "keyword_overlap": ["review", "pr"],
  "tool_overlap": ["github"],
  "reasons": ["keyword overlap: review, pr", "tool overlap: github"]
}
```

---

## 5. 四个脚本工具详解

所有脚本均位于 `scripts/` 目录，运行时将 `scripts/` 目录加入 `PYTHONPATH`（或通过 `server.py` 的 `sys.path.insert`）。

### 5.1 `match_workflows.py`

**用途**：从命令行匹配任务描述与已有 workflow。

```bash
python3 scripts/match_workflows.py "帮我 review 这个 PR" \
  --dir ./.openclaw/workflows \
  --tools github,git \
  --limit 3
```

**输出示例**：

```json
{
  "task": "帮我 review 这个 PR",
  "tools": ["github", "git"],
  "matches": [
    {
      "workflow_id": "pr-review",
      "name": "PR Review",
      "score": 0.632,
      "keyword_overlap": ["review", "pr"],
      "tool_overlap": ["github"],
      "reasons": ["keyword overlap: review, pr", "tool overlap: github"]
    }
  ],
  "suggestion": {
    "workflow_id": "pr-review",
    "name": "PR Review",
    "message": "This looks similar to your \"PR Review\" workflow. Want to reuse that SOP?",
    "score": 0.632
  }
}
```

### 5.2 `capture_workflow.py`

**用途**：从任务描述和步骤文本生成 workflow 草稿（不写入文件）。

```bash
python3 scripts/capture_workflow.py "Review PRs with risk-first approach" \
  --steps "Load PR context
Analyze diff for risks
Draft review comments
Summarize findings" \
  --tools github,git
```

**核心逻辑**：调用 `workflow_engine.capture_workflow()`：
1. 从任务描述提取关键词
2. 解析步骤文本（支持 `|` 分隔的 title|instruction 或 `:` 分隔）
3. 生成 slug 化的 id
4. 组装完整 workflow 对象

### 5.3 `new_workflow.py`

**用途**：在指定目录创建一个空白 workflow 文件。

```bash
python3 scripts/new_workflow.py "PR Review" --dir ./.openclaw/workflows
# 输出：.openclaw/workflows/pr-review.json
```

**核心逻辑**：
1. 从 name 生成 kebab-case slug
2. 若 slug 太短（≤2 字符，如中文名），用时间戳后 6 位作为 fallback
3. 写入模板 JSON 文件

### 5.4 `save_workflow.py`

**用途**：保存新 workflow 或更新已有 workflow。

```bash
# 新建
python3 scripts/save_workflow.py "Review PRs" \
  --dir ./.openclaw/workflows \
  --steps "Fetch context\nAnalyze diff\nDraft summary" \
  --tools github,git

# 更新已有
python3 scripts/save_workflow.py "Review PRs with risk-first" \
  --dir ./.openclaw/workflows \
  --update "pr-review" \
  --keywords "pr,review,diff,risk"
```

**核心逻辑**：
1. 调用 `capture_workflow()` 生成草稿
2. 若指定 `--update`：读取旧文件，与草稿合并（保留原 id），version +1
3. 若新建：直接写入 `{id}.json`

### 5.5 `render_workflow_prompt.py`

**用途**：将 workflow JSON 渲染为人类可读的**执行摘要**（Execution Brief）。

```bash
python3 scripts/render_workflow_prompt.py ./.openclaw/workflows/pr-review.json \
  --task "帮我 review 这个 PR"
```

**输出示例**：

```
Workflow: PR Review

Current Goal
- 帮我 review 这个 PR

Workflow Summary
- Review pull requests with a risk-first pass and short final summary.

Trigger Keywords
- pr
- review
- diff
- patch

Preferred Tools
- github
- git

Ordered Steps
- Fetch change context: Load the PR, changed files, and recent comments.
- Inspect risk and regressions: Prioritize behavior changes, hidden coupling, and missing tests.
- Draft review output: Present findings first, then open questions, then a short summary.
```

---

## 6. 本地 UI 详解

### 6.1 启动方式

```bash
python3 /Users/zyq/.openclaw/workspace/skills/work-style-memory/ui/server.py \
  --dir ./.openclaw/workflows \
  --host 127.0.0.1 \
  --port 8765
```

启动后访问 `http://127.0.0.1:8765`

### 6.2 技术架构

- **后端**：Python 标准库 `http.server.ThreadingHTTPServer`（多线程，支持并发请求）
- **前端**：原生 HTML + CSS + JavaScript，无框架依赖
- **通信**：JSON over HTTP（Fetch API）
- **数据**：直接读写 workflow JSON 文件，无数据库

### 6.3 目录优先级

```python
def default_workflows_dir():
    1. ./.openclaw/workflows        # 项目级（优先）
    2. $CODEX_HOME/work-style-memory/workflows  # 全局级
    3. ./.openclaw/workflows        # fallback
```

### 6.4 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/meta` | 返回 workflow 目录路径和文件数量 |
| `GET` | `/api/template` | 返回空白模板 |
| `GET` | `/api/workflows` | 返回所有 workflow 列表（含 id/name/summary/keywords/updated_at） |
| `GET` | `/api/workflows/<id>` | 返回单个 workflow 完整 JSON |
| `POST` | `/api/workflows` | 保存或新建 workflow（含 `_original_id` 支持重命名） |
| `POST` | `/api/match` | 对任务描述匹配 workflow（调用 `find_matches`） |
| `POST` | `/api/capture-draft` | 从任务+步骤+工具生成草稿（调用 `capture_workflow`） |
| `POST` | `/api/render-brief` | 渲染 workflow 为执行摘要（调用 `render_execution_brief`） |

### 6.5 UI 三大页面

#### 页面 1：Workflow 列表（Sidebar）
- 显示所有 workflow（name、summary、关键词 pill、更新时间）
- 搜索框支持按 name/summary/keyword 过滤
- 点击选中，右侧高亮
- New Workflow / Refresh 按钮

#### 页面 2：Workflow 详情（Editor Hero）
- 显示当前编辑的 workflow 名称
- 状态 banner（保存成功/失败提示）

#### 页面 3：Workflow 编辑器（Form + JSON Preview）
- **Form 标签页**：
  - Basic Info（name、summary）
  - Triggers（keywords，逗号分隔）
  - Steps（动态增删行，每行 title + instruction）
  - Tool Preferences（动态增删行，每行 tool + purpose）
  - Save / Reload 按钮
- **JSON Preview 标签页**：实时预览 Form 对应的 JSON，可用于复制或确认

### 6.6 安全校验

- Workflow id 仅接受小写 kebab-case（`/^[a-z0-9][a-z0-9-]*$/`）
- 保存时检查 id 冲突（同一目录内唯一）
- 支持 `_original_id` 字段以支持重命名（删除旧文件 + 创建新文件）

---

## 7. 对话流程（Agent 行为）

### 7.1 四阶段循环

```
┌─────────────────────────────────────────────────────┐
│  1. MATCH  — 执行任务前检查 workflow 库              │
│         ↓                                           │
│  2. ASK   — 高置信度时询问是否复用                   │
│         ↓                                           │
│  3. EXECUTE — 使用执行摘要运行任务                   │
│         ↓                                           │
│  4. CAPTURE — 任务完成后询问是否保存/更新             │
└─────────────────────────────────────────────────────┘
```

### 7.2 Preflight 行为（任务执行前）

1. 判断 workflow 目录：
   - 项目级：`.openclaw/workflows/`
   - 全局级：`$CODEX_HOME/work-style-memory/workflows/`
2. 运行 `match_workflows.py`（或调用 `find_matches()`）
3. 若最高分 ≥ 0.55，构造 suggestion 消息询问用户
4. 若用户同意，调用 `render_workflow_prompt.py` 生成执行摘要

**询问话术示例**：
> "This looks similar to your 'PR Review' workflow. Want me to reuse that SOP?"

### 7.3 多个候选时的处理

- 若有 **两个** 候选分数接近（都 ≥ 0.55），同时展示两个，询问用户选哪个
- 若无高置信匹配，不询问，继续正常执行任务

### 7.4 Post-Run 行为（任务完成后）

满足以下任一条件时，询问是否保存 workflow：

- 任务包含多个非平凡步骤
- 用户纠正了步骤顺序或工具偏好
- 流程可能重复

**询问话术示例**：
> "Want me to save this as a reusable workflow for next time?"

若用户同意：
- 调用 `capture_workflow.py` 生成草稿
- 调用 `save_workflow.py` 写入文件

若明显是已有 workflow 的更新（intent 相同但步骤有调整）：
- 调用 `save_workflow.py --update <id>` 进行增量更新

---

## 8. Workflow 生命周期

### 8.1 新建

1. 用户在对话中完成一个多步骤任务
2. Agent 询问是否保存
3. 用户同意 → 调用 `capture_workflow.py` 生成草稿
4. 用户确认 → 调用 `save_workflow.py` 写入 `{id}.json`

### 8.2 编辑

两种编辑方式（二者等价，文件是唯一真相）：

- **对话中更新**：用户说"以后用新步骤"，Agent 调用 `save_workflow.py --update`
- **UI 编辑**：打开 `http://127.0.0.1:8765`，Form 界面直接修改，Save 按钮写入文件

### 8.3 删除

直接删除对应 JSON 文件（UI 无直接删除按钮，可通过重命名为不触发匹配的名称间接废弃）。

---

## 9. 存储策略

### 9.1 文件存储

```
项目级：.openclaw/workflows/<id>.json
全局级：$CODEX_HOME/work-style-memory/workflows/<id>.json
```

### 9.2 版本控制

- `version` 字段在每次更新时 +1
- 不做自动迁移，version 增加仅作标记

### 9.3 备份建议

由于 JSON 文件在本地，建议将 `.openclaw/` 目录纳入 Git 版本控制或定期备份。

---

## 10. 启动与运行

### 10.1 启动 UI

```bash
python3 /Users/zyq/.openclaw/workspace/skills/work-style-memory/ui/server.py \
  --dir /Users/zyq/Desktop/.openclaw/workflows
```

### 10.2 初始化 workflow 目录

```bash
mkdir -p ~/.openclaw/workflows
```

### 10.3 从命令行测试匹配

```bash
cd /Users/zyq/.openclaw/workspace/skills/work-style-memory
PYTHONPATH=scripts python3 scripts/match_workflows.py "review PR" \
  --dir ~/.openclaw/workflows \
  --tools github
```

### 10.4 创建第一个 workflow

```bash
PYTHONPATH=scripts python3 scripts/new_workflow.py "My First Workflow" \
  --dir ~/.openclaw/workflows
```

---

## 附录：关键常量

| 常量 | 值 | 说明 |
|------|-----|------|
| 匹配阈值 | `0.55` | 触发复用询问的最低分数 |
| keyword 权重 | `0.55` | 关键词重叠在评分中的权重 |
| name 权重 | `0.20` | 名称重叠的权重 |
| summary 权重 | `0.10` | 摘要重叠的权重 |
| tool 权重 | `0.15` | 工具重叠的权重 |
| 关键词上限 | `12` | 单次匹配最多考虑的 token 数 |
| 匹配结果上限 | `3` | 默认返回的最多候选数 |
| UI 默认端口 | `8765` | 本地 UI 监听端口 |
| UI 默认目录 | `.openclaw/workflows` | 默认 workflow 目录 |
