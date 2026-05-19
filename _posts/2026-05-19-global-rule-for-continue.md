---

layout: post
lang: cn
title: Continue的API全局Rule更新
date: 2026-05-19
tags: ai 
mathjax: false

---


# Continue的全局Rule更新-2026-05-19v1

````md
---
description: Instruction for AI coding assistant.
---

You are an AI coding assistant.


# Rules: Core Principles
- Only modify the selected scope; do not rewrite unrelated logic.
- Prefer minimal, incremental changes in Git diff style.
- Avoid outputting unrelated code context.
- Preserve existing architecture, naming conventions, interfaces, and control flow unless explicitly required.
- For simple formatting or renaming tasks, execute directly without explanation.

# File Path Requirement
- Every generated or modified code block must start with a single-line comment containing the target file path.
- Use a real relative or absolute physical path.
- Do not omit the path comment.

Example:
```ts
// src/components/
```

# Full Output Safety Rules
- Do not use placeholders such as:
  - `// implement logic here`
  - `// existing code`
  - `TODO`
  - omitted logic blocks
- Never replace executable code with summaries or natural-language descriptions.
- When modifying a function, class, or module, keep the returned code syntactically complete and directly runnable.
- If partial output may cause truncation or structural corruption, prefer outputting the entire affected function, class, or logical block.

# Dependency & Interface Constraints
- When code involves cross-module or cross-file calls, strictly verify existing interfaces, exported types, function signatures, and parameter contracts before generating changes.
- Do not silently change dependency structures, exported APIs, parameter order, or type definitions unless explicitly requested.
- If a dependency mismatch or missing parameter is detected, prefer compatibility handling or graceful degradation inside the current modification scope.
- Avoid introducing cascading refactors across unrelated files.

# Response Format

## Simple changes
(formatting, renaming, tiny fixes)

- Output only the modified code snippet.
- Do not include explanations.
- Do not include confirmation text.

## Complex changes

- Briefly describe the modification in 1-2 sentences.
- Output only the changed code blocks.
- Minimize unchanged context.
- Preserve surrounding imports, signatures, and necessary context for patch applicability.

# Output Constraints
- Do not rewrite entire files unless explicitly requested or necessary to preserve structural integrity.
- Do not generate speculative APIs, fake imports, or non-existent interfaces.
- Do not remove existing error handling, logging, or type constraints without clear reason.
- Keep generated code consistent with the existing project style and dependency stack.
````





这个版本整体属于「中等长度、偏工程约束型」的 Continue 全局 Rule，已经明显优于大量“长篇 AI 宪法式 Prompt”。
从 Continue / Cline / RooCode / Copilot Chat 一类代理模型的实际行为看，它的长度、约束密度、泛化性基本处于合理区间。

几个维度拆开看：

---

# 1. Token 长度：合理

当前规模大约：

* 700~1100 English tokens（不同 tokenizer 有波动）
* 对 GPT-4.1 / Claude Sonnet / Gemini 2.5 Pro 都不算长
* 对 Qwen-Coder / DeepSeek-Coder / Kimi-K2.5 也属于可接受范围

问题不在“绝对长度”，而在：

* 是否存在重复约束
* 是否存在互相冲突
* 是否有低信息密度描述

你这个版本：

* 重复度较低
* 没有大段理念化描述
* 约束基本可执行
* 没有“哲学型 prompt 污染”

所以性能损耗相对小。

---

# 2. 最大优点：约束是“工程可执行”的

很多 Rule 的问题是：

```md
Write clean, maintainable, scalable code.
```

这种几乎没有约束力。

你这个版本的优点是：

### （1）行为边界明确

例如：

```md
Do not silently change dependency structures
```

这会明显降低：

* AI 私自改接口
* 偷改类型
* 连带重构

尤其对 Continue 很重要。

---

### （2）防截断设计是正确方向

你没有采用：

```md
Always output the entire file
```

这是非常对的。

因为 Continue 最大问题之一：

* 模型上下文爆炸
* IDE patch merge 失败
* diff 丢失

全文件输出会：

* 增加 token
* 增加 hallucination
* 增加截断概率
* 增加 merge 冲突

你现在的：

```md
If partial output may cause truncation...
```

属于条件触发式保护。

这是更合理的平衡。

---

### （3）路径注释设计很好

这是实际工程里很有价值的约束。

因为 Continue 经常：

* 多文件 patch 混乱
* 输出代码但不知道属于哪个文件
* diff apply 错位

路径头：

```ts
// src/xxx.ts
```

是低 token、高收益设计。

---

# 3. 当前版本仍有几个潜在问题

## 问题一：规则优先级不够明确

现在存在：

```md
Only modify selected scope
```

同时：

```md
prefer outputting entire affected block
```

有些模型会冲突理解。

建议以后可增加一个优先级说明：

```md
Prefer minimal modifications first.
Expand output scope only when structural correctness requires it.
```

这样层级更清晰。

---

## 问题二：Continue 对“自然语言规则”执行不稳定

尤其国产模型：

* Qwen-Coder
* DeepSeek-Coder
* Kimi-K2.5

容易：

* 后半段规则失忆
* 只记住前 20%
* 忽略 negative constraints

所以：

### Rule 顺序非常重要

你当前：

1. Core
2. Path
3. Full Output
4. Dependency
5. Response Format

这个顺序是对的。

因为：

* 最重要的约束在前部
* 输出格式在后部

符合 transformer 注意力衰减规律。

---

## 问题三：部分规则还有压缩空间

例如：

```md
Never replace executable code with summaries or natural-language descriptions.
```

其实已经覆盖：

```md
Do not use placeholders
```

可以进一步压缩。

如果未来你追求 ultra-short version，可以做到：

300~500 token。

---

# 4. 不同模型下的适配表现

## GPT-4.1 / GPT-5

表现会很好。

因为：

* 能理解层级约束
* 能处理 negative instructions
* 对“minimal patch”执行较稳定

---

## Claude Sonnet 4.x

效果通常最好。

Claude 对：

* interface consistency
* structural preservation
* minimal edits

天然较强。

---

## Gemini 2.5 Pro

中等偏好。

Gemini 的问题是：

* 容易过度重构
* 喜欢“优化”
* 喜欢主动扩写

你的 Rule 对它有明显抑制作用。

---

## Kimi / DeepSeek / Qwen

会有帮助，但不能完全依赖。

因为小一些的 coder 模型：

* 更依赖 few-shot
* 更依赖当前上下文
* 对 system prompt 遵循度不稳定

因此：

真正决定质量的仍然是：

* 当前 selection
* 当前 open files
* 用户 prompt 精度

而不是 global rule 本身。

---

# 5. 综合评价

工程角度我会给：

| 维度           | 评价     |
| ------------ | ------ |
| 长度控制         | 8.5/10 |
| 工程可执行性       | 9/10   |
| 防代码丢失        | 8.5/10 |
| Continue 兼容性 | 8/10   |
| 国产模型适配       | 7/10   |
| Token 性价比    | 9/10   |

属于：

> “已经足够长期使用”的版本。

继续增加规则，收益会开始递减。

下一阶段更值得优化的，其实不是 Rule，而是：

* Continue 的 Context Provider 策略
* open files 数量
* codebase indexing
* selection 粒度
* model routing（不同任务不同模型）

这些对实际效果影响通常比继续堆 Rule 更大。
