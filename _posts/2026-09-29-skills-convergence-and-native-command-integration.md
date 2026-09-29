---
layout: post
lang: cn
title: 逐渐膨胀的Agent：全局技能资产规范化与平台原生指令深度融合
date: 2026-09-29
tags: ai
mathjax: true
---



在智能体（Agent）系统的工程化演进中，将散落的提示词拆分为标准化单元往往仅是治理的开端。

三周前，我们将早期松散的全局工作流重构为以 [Skills（技能）](file:///C:/Users/Reaticle/.gemini/config/skills) 与 Rules 为基准的模块化架构，依托“渐进式披露”与“能力自包含”解决了大部分静态提示词膨胀问题。然而，当工程实践延伸至更多垂直场景后，物理目录层面的初步模块化迅速迎来了二次熵增：随着文档编译、音频处理、写作风格、代码发布等专用工具的不断加入，全局 `config/skills/` 目录下平铺累积了多达 23 项自研技能。

平铺目录看似便于检索，但在实际高频交互中暴露出严峻的结构性断层。更重要的是，平台底层在持续演进中固化了一系列高阶能力——例如多轮决策收敛指令 `/grill-me`、终局免值守闭环指令 `/goal`、经验固化指令 `/learn` 以及沙箱受控提权规范 `permissioned-github`。自研技能体系如果脱离这些底层平台契约独立演化，势必陷入意图漂移、沙箱报错与执行中断的泥潭。

近期，我们针对全局技能资产完成了一次系统性的收敛重构：确立了“1 个高频工程中枢 + 5 大垂直领域插件包”的解耦拓扑，并将自研生命周期与平台原生指令完成深度契约对齐。本文复盘这一方案的诊断过程、架构拓扑与微观实现机制。

---

## 1. 平铺目录下的意图漂移与运行时机制证伪

要确立正确的治理路径，首先需要厘清平铺架构在真实会话中的微观退化路径，并对底层加载机制进行求真证伪。

```text
~/.gemini/config/skills/ (早期平铺现状: 23 项技能混杂)
├── collector/            # 核心研发中枢 (高频)
├── researcher/           # 核心研发中枢 (高频)
├── analyzer/             # 核心研发中枢 (高频)
├── builder/              # 核心研发中枢 (高频)
├── verifier/             # 核心研发中枢 (高频)
├── reviewer/             # 核心研发中枢 (高频)
├── docx-template-sync/   # 垂直文档排版 (低频)
├── office-parser/        # 垂直文档解析 (低频)
├── typst/                # 垂直文档排版 (低频)
├── typst-archiver/       # 垂直文档排版 (低频)
├── typst-publisher/      # 垂直文档排版 (低频)
├── chinese-insight-writer/    # 垂直文体风格 (低频)
├── chinese-reflective-writer/ # 垂直文体风格 (低频)
├── english-reflective-writer/ # 垂直文体风格 (低频)
├── industry-report-writer/    # 垂直文体风格 (低频)
├── research-paper-writer/     # 垂直文体风格 (低频)
├── svg-designer/         # 垂直矢量图形 (低频)
├── svg-skill-curator/    # 垂直矢量图形 (低频)
├── web-theme-curator/    # 垂直样式系统 (低频)
├── release-curator/      # 垂直工程发布 (低频)
├── wiki-curator/         # 垂直工程维护 (低频)
├── ai-lyrics-aligner/    # 垂直音频对齐 (低频)
└── audio-metadata-manager/ # 垂直音频标签 (低频)
```

### 1.1 调用频度断层与语义污染

对过往高频研发交互的审计表明，技能的使用频率呈现出两极分化的断层现象：

1. **核心工程环（Hexagon Pipeline）占据绝对吞吐**：  
   由 `collector`（本地资产扫描） $\rightarrow$ `researcher`（外部事实查证） $\rightarrow$ `analyzer`（系统解构与规划） $\rightarrow$ `builder`（交付实现） $\rightarrow$ `verifier`（独立证伪） $\rightarrow$ `reviewer`（质量验收）构成的 6 项通用中枢技能，覆盖了 85% 以上的代码重构、架构设计与质量交付周期。
2. **垂直领域工具呈现偶发性与局部性**：  
   剩余 17 项技能高度特化于特定场景（例如逆向提取 Word 样式指纹、嵌入音频 ID3 标签、生成 Typst 排版、向 GitHub 推送版本 Release 等）。

当这 23 项技能在根目录下平行展开时，虽然每个技能的正文 `SKILL.md` 处于按需加载状态，但它们的元数据定义（YAML Frontmatter 中的 `name` 与 `description`）却共同争夺 Agent 的路由注意力。大量垂直工具中相似的动词（如“提取”、“分析”、“检查”）导致描述判别力被稀释，极易诱发意图理解时的语义漂移，甚至在通用编码过程中误激活特定文体或排版技能。

### 1.2 加载机制核查：破除物理移动的幻觉

在治理初期，一种直觉设想是：“只要把低频技能移动到 `plugins/` 目录下，就能将其从全局 Prompt 中彻底隔绝，从而节省上下文开销”。

然而，对 Antigravity 运行机制的严格测试推翻了这一推测：
在 Agent 启动扫描中，全局配置根（`~/.gemini/config/`）下不论是直接位于 `skills/` 的目录，还是嵌套在 `plugins/<plugin_name>/skills/` 下的目录，只要该插件处于被发现与启用状态，其 `name` 与 `description` 元数据都会被提取并注入系统初始上下文中。

这意味着，单纯物理重命名或搬迁目录，并不能自动消除元数据加载的基线开销。治理的真实价值点不在于追求“零上下文驻留”的技术幻觉，而在于**目录职责正交化**与**领域命名空间清晰化**：
- 通过将垂直工具打包归入领域包，剥离核心中枢的杂质，大幅提升核心 6 大技能描述的辨识度；
- 为后续通过显式清单（如 `plugins.json`）按需启闭领域套件提供标准化单元，避免未来扩展时全局根目录继续无序膨胀。

---

## 2. 拓扑解耦：高频中枢保留与垂直插件化收敛

针对上述诊断，方案重构了全局资产拓扑，确立了 **“1 个核心中枢基线 (Global Core Hub) + 5 大垂直命名空间插件 (Domain Plugin Bundles)”** 的解耦架构。

```text
~/.gemini/config/
├── skills/                     # [Global Core Hub] 仅保留 6 大高频工程中枢
│   ├── collector/              # 只读资产雷达
│   ├── researcher/             # 外部事实核查
│   ├── analyzer/               # 系统分析与方案规划 (融合 /grill-me)
│   ├── builder/                # 交付生成与落地 (融合 /goal)
│   ├── verifier/               # 微观白盒证伪
│   └── reviewer/               # 宏观质量验收 (引导 /learn)
│
└── plugins/                    # [Domain Plugin Bundles] 5 大垂直领域插件包
    ├── document-publishing/    # 文档出版与排版插件 (5 项技能)
    │   ├── plugin.json
    │   └── skills/{docx-template-sync, office-parser, typst, typst-archiver, typst-publisher}
    ├── creative-writing/       # 专业写作与深度表达插件 (5 项技能)
    │   ├── plugin.json
    │   └── skills/{chinese-insight-writer, chinese-reflective-writer, english-reflective-writer, ...}
    ├── frontend-design/        # 前端矢量与样式系统插件 (3 项技能)
    │   ├── plugin.json
    │   └── skills/{svg-designer, svg-skill-curator, web-theme-curator}
    ├── devops-curator/         # 工程运维与发布维护插件 (2 项技能)
    │   ├── plugin.json
    │   └── skills/{release-curator, wiki-curator}
    └── media-processor/        # 音视频多媒体处理插件 (2 项技能)
        ├── plugin.json
        └── skills/{ai-lyrics-aligner, audio-metadata-manager}
```

### 2.1 高频工程中枢的正交化定位

保留在根目录下的 6 项技能承担着系统工程生命周期的基石职能。需要明确的是，这 6 项技能是**高度解耦的正交工具集**，并非僵化的单向瀑布流。

在日常敏捷开发中，开发者可以单独调用 `/verifier` 针对某个算法进行纯逻辑边界证伪；也可以直接触发 `/builder` 执行局部补丁；而在面对重大方案重构时，它们则能够顺畅串联。剥离了垂直领域的干扰后，6 大中枢的 YAML 描述被重新修剪，精确限定其在工程周期中的职责，杜绝了职责重叠。

### 2.2 垂直领域的能力内聚与债务清理

17 项专用技能依据业务客体收敛至 5 个独立插件包中，每个插件均配备自包含的 `plugin.json` 声明。

在迁移过程中，我们同步清理了历史架构留下的隐性债务：早期部分前端矢量技能（如 `web-theme-curator`、`svg-designer`）内部的 Python 自动化质检脚本中，存在指向旧绝对路径（`~/.gemini/config/skills/...`）的硬编码。通过全局静态扫描与替换，所有脚本调用与文档引用统一校准为新的插件相对及绝对位置，消除了路径漂移引发的运行时异常风险。

---

## 3. 契约重构：自研体系与平台原生指令的深度融合

目录层面的收敛确立了清晰的结构骨架，而架构升级的深层价值在于**消除自研流程与平台原生底座之间的断层**。

过去，自研技能往往作为孤立的提示词规则运行，难以调动平台的深层能力。在此次重构中，我们系统性地将四项原生能力与中枢技能进行了契约化绑定。

```text
+-----------------------------------------------------------------------------------+
|                           Antigravity 平台底层契约                                  |
|  ask_question UI  |  终局迭代模型  |  permissioned-github  |  /learn 规则固化引擎   |
+---------+-----------------+-------------------+-------------------+---------------+
          |                 |                   |                   |
          v                 v                   v                   v
+-------------------+-------------------+-------------------+-------------------+
|     /analyzer     |     /builder      |  devops-curator   |     /reviewer     |
| 澄清访谈门禁机制   | 终局自主闭环契约   | 沙箱提权断言机制   | 高门槛沉淀引导机制 |
| (Pre-Analysis)    | (Goal-Mode Loop)  | (Pre-flight)      | (Post-Review)     |
+-------------------+-------------------+-------------------+-------------------+
```

### 3.1 消除预设立场的澄清门禁：`/analyzer` 融合 `/grill-me` 与 `ask_question`

在复杂系统设计中，最常见的失误是 Agent 基于含混的需求描述直接推导实现路径，导致生成出与真实意图偏差巨大的虚假架构。

Antigravity 提供了原生交互式提问工具 `ask_question` 与 `/grill-me` 访谈理念。方案在 [`config/skills/analyzer/SKILL.md`](file:///C:/Users/Reaticle/.gemini/config/skills/analyzer/SKILL.md) 中正式确立了 **Pre-Analysis Clarification Protocol（前置澄清协议）**：

- **触发条件**：当输入需求存在 2 种以上异构技术选型（如单体迁移 vs 微服务解耦）、关键系统边界不明确或缺少架构约束时，禁止直接起草方案文档。
- **微观机制**：`analyzer` 主动中断单向推演，调用平台原生的 `ask_question` 弹出模态选择框，提供带有推荐倾向的选项与自定义输入槽，逐枝收敛决策树。
- **边界约束**：若用户显式输入 `/grill-me`，则强制进入递归访谈模式，穷尽所有设计分歧后，再生成具备交互确认属性的实施方案（Plan Artifact）。

这种机制从源头上阻断了“未经验证的假设”渗透进系统设计。

### 3.2 免人工值守的自治闭环：`/builder` 融合 `/goal` 契约

传统的代码生成往往是“单步尝试即停”的交互模式：Agent 编写完代码后便交还控制权，一旦出现测试不通过或语法错误，需要用户反复介入充当“传话筒”。

平台提供的 `/goal` 指令要求 Agent 在目标彻底达成前自主闭环迭代。方案在 [`config/skills/builder/SKILL.md`](file:///C:/Users/Reaticle/.gemini/config/skills/builder/SKILL.md) 中注入了 **Goal-Mode Autonomous Contract（终局自主交付契约）**：

```text
[用户输入 /goal]
       |
       v
+---------------------------------------------------------+
| 锁定基准 Plan Artifact (唯一交付准绳)                      |
+---------------------------------------------------------+
       |
       +-----> 批量执行代码变更 / 资产生成
       |              |
       |              v
       |       调用 /verifier 进行白盒证伪与执行测试
       |              |
       |       [测试未通过 / 发现边界异常]
       |              |
       <--------------+ (自主诊断根因，执行修复，禁止中途抛回给用户)
       |
       |       [验证全部 PASS]
       v
提交 /reviewer 执行宏观规范门禁验收
       |
       v
输出结构化交付报告与终局验证事实依据
```

- **执行准绳**：在 `/goal` 模式下，执行严格以经用户批准的实施方案（Plan Artifact）为唯一交付锚点，严禁擅自扩大范围或削减既定用例。
- **故障自愈机制**：当微观测试或 `verifier` 抛出错误时，`builder` 严格自主启动“根因定位 $\rightarrow$ 生成补丁 $\rightarrow$ 重新回归验证”的闭环，穷尽排查手段，坚决杜绝在遭遇首个失败用例时就中断退出并向用户交付半成品。
- **交付输出**：终局退出时，统一给出包含全部修改清单、测试覆盖与证伪依据的完整闭环报告。

### 3.3 穿越安全沙箱的操作规范：`devops-curator` 对齐 `permissioned-github`

在容器化或沙箱隔离环境中，Agent 直接调用未经授权的 `git push` 或通过 HTTP 脚本直连 GitHub API，会遭遇平台的严格拦截。

`devops-curator` 插件旗下的 `release-curator` 与 `wiki-curator` 涉及版本发布、Tag 推送与 Wiki 同步等关键操作。方案对齐了平台官方安全标准 [permissioned-github](file:///C:/Users/Reaticle/.gemini/antigravity-ide/builtin/skills/permissioned-github/SKILL.md)，确立了提权通信机制：

1. **命令行基准**：
   - 远程 Issue、PR 与 Release 管理统一收敛至官方 `gh` CLI，且明确要求携带 `-R ORG/REPO` 参数定位上下文；
   - 分支操作与 Commit/Tag 推送限定使用标准 `git` 命令；
   - 杜绝使用临时脚本随意组装未经审计的网络请求。
2. **工具可用性前置断言（Pre-flight Assertion）**：
   - 针对不同运行宿主（部分无沙箱拦截的本地开发环境 vs 平台严格沙箱环境），技能在准备提权前执行工具探测：若环境中未注册 `ask_permission` 工具，立即停止盲目重试，向用户清晰解释权限拦截原因并提供推荐手动执行的标准命令。
3. **标准提权载荷契约**：
   - 在沙箱环境中遭遇权限拒绝后，调用 `ask_permission` 时严格按照规范格式封装 Target，例如更新已有分支限定采用 `git.update({"org": "ORG", "repo": "REPO", "branch": "BRANCH"})`，从协议层面消除权限异常。

### 3.4 防范规则膨胀的沉淀机制：`/reviewer` 对齐 `/learn`

在交付审查阶段，发现反模式或技术暗坑是常态。平台提供的 `/learn` 指令支持将经验固化为全局规则文件。然而，如果由 Agent 在每次交付后都主动或滥用规则沉淀，会导致 `GEMINI.md` 或 `rules/` 迅速膨胀，形成严重规则过拟合与上下文底噪消耗。

方案在 [`config/skills/reviewer/SKILL.md`](file:///C:/Users/Reaticle/.gemini/config/skills/reviewer/SKILL.md) 中确立了 **Post-Review Learning Recommendation（审后高门槛推荐机制）**：

- **权限边界确立**：Slash Commands 属于用户界面交互指令，Agent 自身无权也不应当越权代执行 `/learn`。
- **高阈值过滤机制**：针对业务特定的局部代码瑕疵，直接在审查报告中指出并要求修复即可，严禁向规则库沉淀；只有当捕获到**具备跨项目通用性**的深层框架暗坑、底层运行时版本兼容性陷阱或具有普适价值的反模式时，方可在评审报告结尾附加一条轻量提示：
  > 💡 **提示**：本次交付捕获到底层运行时的通用兼容性约束，如有需要可手动执行 `/learn` 将其固化为系统规则。
- 最终的规则持久化权力始终完整交由开发者裁决。

---

## 4. 实施成效与交付基线

截至 2026 年 9 月 29 日，该重构方案已全部执行落地。对照最初制定的验收门禁，系统的运行状态达成了以下确定性指标：

| 评估维度 | 重构前状态 (平铺阶段) | 重构后状态 (正交收敛阶段) | 机制改进效果 |
| :--- | :--- | :--- | :--- |
| **根目录技能纯净度** | 23 项技能无序平铺，职责重叠 | 严格保留 6 项通用工程中枢 | 消除根目录语义污染，提升核心工程路由判别力 |
| **领域工具组织形式** | 孤立脚本文件，零散暴露 | 5 大命名空间插件封装，含 `plugin.json` | 形成高内聚的业务工具单元，资产零损耗迁移 |
| **需求分歧处理模式** | 依赖 Agent 单向推测，极易偏离意图 | 深度绑定 `ask_question` 与 `/grill-me` | 前置多选模态交互，逐枝锁定关键架构决策 |
| **长交付闭环能力** | 遇到执行错误易中断抛出，需人工传话 | 注入 `/goal` 终局自主“定位-修复-复验”循环 | 实现复杂工程场景下的全流程自愈交付 |
| **DevOps 沙箱合规** | 存在直连 API 风险与提权格式异常 | 严格遵守 `permissioned-github` 提权规范 | 具备前置工具断言，双轨适配沙箱与开放环境 |
| **系统经验沉淀控制** | 缺乏规范，容易导致规则库无序膨胀 | 建立高阈值 `/learn` 建议引导机制 | 遏制规则膨胀，将经验沉淀决策权归还开发者 |

---

## 5. 演进方向与后续落地

从工作流平铺到 Skills 模块化，再到如今的“中枢正交化 + 领域插件打包 + 原生契约融合”，Agent 定制架构的演进始终围绕着**提升确定性**与**降低认知噪声**展开。

后续系统演进将重点关注两个方向：

1. **显式插件按需加载治理（Explicit Activation Matrix）**：  
   探索通过轻量配置文件（如工作区级 `plugins.json`）实现对垂直插件包的显式开关控制，在项目启动阶段阻断无关领域的元数据扫描，进一步净化初始上下文预算。
2. **垂直插件与本地知识库（KI）的深度解耦**：  
   将特定插件配套的领域知识资产（如 Typst 官方排版手册规范切片、音频编解码标准）进一步规范化沉淀至 Knowledge Items，建立标准知识索引，使技能的提示词体积保持极致精炼，专注于逻辑调度与微观计算契约。

通过持续收敛系统边界与理顺协作机制，Agent 才能真正从“偶有惊艳但难以预测的问答玩具”，稳步迈向“具备确定性、可解释性与自主闭环能力的工程副驾驶”。
