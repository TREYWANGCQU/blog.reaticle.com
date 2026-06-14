---
layout: post
lang: cn
title: 从 VS Code Continue 迁移 Agent 体系到 Antigravity IDE：实践复盘与优化路径
date: 2026-06-14
tags: ai
mathjax: false
---

在软件工程演进中，工具链的更迭往往伴随着生产关系的重塑。

早期的 AI 辅助开发，开发者习惯在 VS Code 中通过 Continue 这类插件构建个性化的 Agent 体系。通过在项目根目录下维护一个 `rules/` 目录，将不同的提示词文件（如 `collector.prompt`, `chinese-insight-writer.prompt`）加载到上下文，实现任务分工。这类似于手工工坊时代的生产模式：开发者手工调度工具，利用零散的提示词文件对模型进行阶段性引导。

随着 Antigravity IDE 的引入，这一套零散的提示词体系迎来向工业化流水线迁移的契机。

---

# 一、 迁移的背景与动因

在 VS Code Continue 体系下，多 Agent 协同存在系统性限制。

首先，**规则控制缺乏硬性边界**。在 Continue 中，虽然我们可以定义 `collector.prompt` 负责上下文收集，但模型在实际执行时，常常越过职责边界，在信息收集阶段直接开始编写代码或输出未经论证的方案。

其次，**执行链条依赖人工干预**。从收集信息（Collector）到设计方案（Analyzer），再到代码实现（Builder），开发者必须手动在不同的提示词窗口或对话上下文中切换，缺乏统一的状态机管理。

Antigravity IDE 改变了这一机制。它引入了全局工作流（Global Workflows）的设计：

```text
// C:\Users\Reaticle\.gemini\config\global_workflows
rules/
├── global.md (全局基础规则)
├── collector.prompt -> collector.md (上下文收集工作流)
├── researcher.prompt -> researcher.md (技术调研工作流)
├── analyzer.prompt -> analyzer.md (架构分析工作流)
├── builder.prompt -> builder.md (代码构建工作流)
├── verifier.prompt -> verifier.md (测试验证工作流)
└── reviewer.prompt -> reviewer.md (代码审计工作流)
```

将 VS Code Continue 的 `.prompt` 文本迁移为 Antigravity 的 `.md` 工作流文件，将原本松散的提示词转化为具备严格约束（Constraints）、职责（Responsibilities）和输出格式（Output Format）的标准作业程序（SOP）。

---

# 二、 VS Code Continue 与 Antigravity IDE 架构对照

我们可以从微观执行机制上对比两者的差异：

| 维度 | VS Code Continue (旧体系) | Antigravity IDE (新体系) |
| :--- | :--- | :--- |
| **定位** | 基于提示词增强的单轮交互助手 | 具备多工具调度与状态流转的工程代理系统 |
| **规则载体** | 存放于项目内的 `rules/*.prompt` 文本文件 | 全局配置 `global_workflows/*.md` 结构化文件 |
| **约束强度** | 弱约束，模型易产生幻觉，跳过预设步骤 | 强约束，通过 YAML 元数据与 Constraints 规约动作 |
| **工作流流转** | 手工复制上下文或手动切换提示词模板 | 平台原生编排，按照收集-分析-构建-验证闭环执行 |
| **工具调用** | 受限于终端和文件系统的读写隔离 | 原生集成文件读写、Grep 搜索、命令行执行等工具 |

在 Continue 体系中，`chinese-insight-writer.prompt` 这类风格 Agent 常常与 `builder.prompt` 这类流程 Agent 混淆。在 Antigravity 中，这两类 Agent 被清晰地划分了职责边界：

*   **流程 Agent**（如 Collector, Analyzer, Builder, Verifier, Reviewer）负责控制代码和技术方案的研发生命周期，串联起从调研到上线验证的链路。
*   **风格 Agent**（如 Chinese Insight Writer, English Reflective Writer）则作为 Builder 阶段的可替换组件。当任务转化为撰写博客、行业报告或技术提案时，由对应的风格 Agent 接管 Builder 的内容生成，保持个人表达特征。

---

# 三、 迁移实践复盘

在实际迁移过程中，并非将 `.prompt` 文件直接重命名为 `.md` 即可运行，必须针对 Antigravity 的解析机制进行结构重构。

以 `chinese-insight-writer` 的迁移为例，旧版的 `.prompt` 仅定义了角色和一些粗颗粒度的原则，而在 Antigravity 中，它被重构为包含 YAML Frontmatter 和结构化 Markdown 块的标准工作流：

```markdown
// C:\Users\Reaticle\.gemini\config\global_workflows\chinese-insight-writer.md
---
description: acts as a chinese-insight-writer
name: chinese-insight-writer
---
# Role
你负责将观点、经验、案例或事实材料组织为具有逻辑递进、结构完整、可落地执行的中文文章。
...
```

在重构过程中，有三项关键机制得到了明确：

1.  **输入与输出的确定性**：流程 Agent 的输出必须是下一个 Agent 的输入。例如，`analyzer.md` 输出的工期拆解（WBS）和验收标准（Acceptance Criteria），直接作为 `builder.md` 的前置条件。
2.  **硬性约束的设立**：在 `collector.md` 中，明确写入 `- No solution design.` 与 `- No code generation.` 约束。IDE 在调度该工作流时，会严格限制模型的动作范围。
3.  **运行环境隔离**：所有的脚本执行、搜索和读写动作，均限制在当前工作空间内，防止越权操作。

---

# 四、 提升意见与后续行动方案

为了最大化发挥 Antigravity IDE 的架构优势，后续的体系建设需关注以下方向：

### 1. 完善工作流的失效边界与降级机制
当前多 Agent 链条在面对高度模糊的需求时，容易在 `collector` 阶段收集到冗余或无关的上下文，导致 `analyzer` 阶段产生架构设计的偏差。
*   **行动方案**：在工作流中增加“人工确认阀”（Human-in-the-loop Gate）。在 `collector` 完成上下文收集、`analyzer` 完成方案设计后，必须经由开发者显式确认，方可触发 `builder` 执行代码写入。
*   **责任主体**：由 IDE 执行器负责中断并发出确认请求，开发者作为决策主体进行质量把关。

### 2. 精细化 Token 成本控制
多轮 Agent 协同需要频繁读取文件和运行测试，Token 消耗量远超普通对话。
*   **行动方案**：建立模型分层路由。在全局配置中，将轻量级的代码补全与局部修改路由至低成本模型，仅在复杂的架构分析与高风险重构时启用 Frontier Model。同时，合理配置项目忽略规则（如忽略 `.git`, `node_modules`, 编译产物等），防止无意义的全局扫描。
*   **边界条件**：当前工作空间的文件数量超过 500 个或单文件大小超过 1MB 时，必须强制使用 `grep_search` 替代全量读取。

### 3. 自动化工作流校验
由于工作流文件以 Markdown 格式存储，随着规则增多，规则之间的冲突概率上升。
*   **行动方案**：引入自动化静态检查脚本，定期校验 `global_workflows/` 目录下的规则一致性，确保流程 Agent 的输出格式能被后置 Agent 完美解析。

从手工配置走向平台原生编排，AI 辅助开发已经不再是简单的“人机对话”，而是一套科学的、可度量的软件工程方法论。通过此次迁移，个性化表达与技术工程流实现了分层解耦，为后续更复杂的自动化研发奠定了基础。
