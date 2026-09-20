---
layout: post
lang: cn
title: 生成万行代码只需几秒，调好一个字号却要耗费整晚？
date: 2026-09-20
tags: ai
mathjax: true
---

# 为什么大模型总想把字变小？

在大模型（LLM）驱动的代码生成工程中，前端交互界面与矢量图表（SVG）的构建效率得到了数量级的提升。然而，当工程师将生成产物投入高保真大屏、移动端或投影视件时，常常会遭遇一种隐蔽但致命的可读性坍塌：辅助标签、图表刻度或流程图节点中充斥着 `8px`、`9px` 甚至 `10px` 的微小字号。

深入分析大语言模型的生成逻辑可以发现，这种现象并非随机错误，而是模型在面对复杂几何约束时展现出的**“空间代偿本能”**——当文字内容超出容器几何宽度或图表轴段间距时，模型为了避免图元重叠或文字溢出容器，会下意识地选择缩小字号这一边际阻力最小的逃逸路径。

缩减字号虽然在视觉排版上掩盖了溢出错误，却直接穿透了人眼感官可读性的物理底线。更严重的是，许多团队在尝试治理这一顽疾时，往往由于边界模糊陷入次生陷阱：要么在通用审查阶段实施粗暴的“字号放大 Auto-Fix”，导致布局几何级联重排崩溃；要么将特定媒介的排版细则硬编码进全局通用工作流，造成 Agent 元架构的污染与退化。

本文基于近期的工程实践，结合前端样式派生与矢量图形渲染的真实运行机制，系统拆解字阶失真的微观成因，并确立一套跨越 CSS、Canvas 与 SVG 的确定性四层治理架构。

---

## 1. 现象复盘：大模型在多媒介排版中的退化路径

要建立严密的防御体系，首先需要还原大模型在不同渲染媒介下触发“微小字号失真”的具体路径。

![大模型在多媒介排版中的退化路径与次生治理陷阱](/assets/img/typography-degradation-and-naive-fix.svg)

### 1.1 CSS 与动态图表：散落的魔法数字与逃避策略
在 Web 页面与可视化组件编写中，模型的空间代偿表现为两类形态：
1. **CSS 辅助元素的无序缩放**：在处理卡片角标（Badge）、表格脚注、状态提示时，模型倾向于脱离项目的主题规范，顺手写下 `font-size: 10px` 或 `font-size: 0.625rem`；
2. **可视化脚本深层硬编码**：在 ECharts、D3、Canvas 或 Three.js 脚本中，当 X 轴标签密集或图例超长时，模型为了避免标签碰撞，直接在配置对象深处注入 `axisLabel: { fontSize: 9 }` 或 `ctx.font = '10px sans-serif'`。

此类代码不仅打破了 UI 设计系统的一致性，且在不同设备 DPI 下极易触发浏览器的反锯齿模糊，或遭遇 Chrome 等浏览器对小于 12px 文本的强制缩放干预，造成布局不可预测的移位。

### 1.2 SVG 矢量环境：绝对坐标系下的排版代偿
与具备原生流式盒模型（Flexbox / Grid）的 HTML 不同，SVG 运行在基于 `viewBox` 的绝对坐标系统中。SVG 原生标准缺失自动折行容器（Flow-text 机制因兼容性受限无法通用）。

当一段业务节点的文字长度达到 180px，而预设的矩形卡片宽度仅有 120px 时，模型无法依赖浏览器的排版重绘（Layout Reflow）实现自然折行。面对几何冲突，模型最便捷的应对方式便是将 `font-size: 14px` 压缩为 `9px`，使文字强行挤入卡片。在矢量图形按比例缩放展示时，9px 的文本在小屏或缩略图下将彻底化为不可辨识的色块。

### 1.3 治理过程中的次生崩溃：Auto-Fix 陷阱
不少团队试图在代码审查（Reviewer）或后处理门禁中加入自动修复规则：一旦匹配到 `font-size: 9px`，直接自动替换为 `12px` 并微调坐标。这种做法随即引发了更严重的几何穿透缺陷。

在几何学上，当文本字号从 9px 提升至 12px 时，单字符的宽度与高度物理膨胀了 $33.3\%$。对于原本紧凑排布的矢量框图，字宽的突增会导致文字直接冲出矩形边界，下游连接线的锚点失效，甚至与相邻节点严重交叠。**字号的提升意味着整个容器包围盒（Bounding Box）与画布全局尺寸的级联重构，绝非静态文本替换可以解决**。

---

## 2. 媒介分野：CSS 与 SVG 渲染特性的物理异同

建立系统化方案的前提，是明确认识到不同渲染宿主在文字排版机制上的底层物理差异。

| 评估维度 | CSS / Web 渲染流 | SVG 矢量图形空间 |
| :--- | :--- | :--- |
| **坐标体系** | 相对/流式定位（盒模型、Flexbox、Grid） | 绝对坐标系（`viewBox`，`x`, `y` 绝对定位） |
| **折行机制** | 原生自动计算（`word-break`, `white-space`） | 依赖开发者或引擎显式构建 `<tspan>` 并计算位移 |
| **尺寸单位** | 推荐使用相对单位（`rem`, `em`, `clamp`） | 固定用户空间单位（无单位数值或 `px`） |
| **空间拥挤主因** | 动态图表（ECharts/Canvas）缺乏 DOM 流式自适应 | 缺少多行容器，文本宽度静态超出卡片宽度 |
| **可读性底线** | $\text{font-size} \ge 12\text{px}$（或 $\ge 0.75\text{rem}$） | $\text{font-size} \ge 12\text{px}$（视网膜舒适生理底线） |

从上表可以看出，尽管 CSS 与 SVG 共享同一个人体工学可读性物理底线（$\ge 12\text{px}$），但两者解决“空间受限”的计算路径完全不同：
- Web 页面只需建立统一的**设计变量（Design Tokens）派生机制**与**图表空间代偿策略**，防止硬编码；
- SVG 矢量图则需要在生成引擎内部植入**空间代偿几何算法**，完成文本修剪、分词断行与容器几何级联外扩。

---

## 3. 总体架构：四层边界契约矩阵

为确保通用构建能力不被具体领域的排版细节污染，同时让排版规范具备强制约束力，系统确立了如下自顶向下的四层边界契约矩阵：

![排版治理四层边界契约矩阵拓扑](/assets/img/typography-four-tier-governance-architecture.svg)

### 3.1 边界防腐原则
1. **元工作流纯净性**：Tier 0 的通用工作流（`builder`、`reviewer`、`verifier`）严禁包含特定技术栈标签（如 `<tspan dy="...">`、`12px` 等具体数字）。它们仅负责调度、合规审查与证伪。
2. **Reviewer 零重排契约**：Reviewer 一旦发现 `font-size < 12px`，判定为 `L2 逻辑/几何层缺陷`，直接签发阻断报告并打回重构，**严禁自行在 Reviewer 阶段修改文字大小与位移坐标**。
3. **单一真相源派生原则**：业务代码严禁裸写像素常数，样式与配置直接溯源至标准设计契约文件。

---

## 4. Web 领域实践：SSOT 契约派生与物理隔离

在 Web 与数据可视化开发中，针对设计变量的维护，长期存在“合并定义还是独立维护”的争议。本方案确立的架构范式为：**数据契约同源，资产物理分离**。

### 4.1 物理分离与同源映射
系统定义 `design-tokens.json` 作为中间唯一真实数据源（Single Source of Truth, SSOT），通过脚手架技能 `web-theme-curator` 自动派生两份目标代码资产：

![设计变量单一真实源 (SSOT) 契约派生与双轨物理隔离](/assets/img/typography-tokens-ssot-derivation.svg)

#### 物理上完全分离的技术考量
1. **运行时渲染引擎的隔离**：`tokens.css` 注册在浏览器的 CSSOM 中，由样式排版引擎处理；`chartTheme.js` 则运行在 V8 等 JavaScript 引擎中，供 Canvas / WebGL 绘图上下文同步读取。
2. **防范 SSR 与无 DOM 环境崩溃**：若依赖 JS 通过 `getComputedStyle` 动态嗅探 CSS 变量，在 Node.js 服务端渲染（SSR）、离线自动化导出（Puppeteer / Worker）或复杂多线程场景下会直接抛出运行时代异常。
3. **打包体积与 Tree-Shaking**：常规纯 HTML/CSS 组件无需引入重量级的 JS 主题包，图表模块亦无需承担样式表动态计算的开销。

### 4.2 离散字阶与空间代偿决策树
在设计契约中，字阶被锁定为严格的离散递增集合：
$$S_{\text{typography}} = \{ 12\text{px (Floor)}, 14\text{px (Base)}, 16\text{px (SubTitle)}, 18\text{px (Title)}, 24\text{px (Headline)}, 32\text{px (Display)} \}$$

当图表 X 轴分类过密导致标签宽度超出可用轴段宽度（$W_{\text{label}} > \Delta X_{\text{tick}}$）时，禁止降字号，转由以下算法路径逐步代偿：

![图表轴段空间代偿四级决策流](/assets/img/chart-axis-spatial-compensation-flow.svg)

---

## 5. 矢量领域实践：几何代偿推导与级联外扩

针对 SVG 的绝对坐标特性，系统将矢量排版引擎收敛至 `svg-designer`，并确立基于物理字符占宽的数学计算模型。

### 5.1 空间代偿排版推导算法
对于任意给定的矩形容器，可用排版宽度为：
$$\text{AvailableWidth} = W_{\text{container}} - 2 \times \text{Padding}_{\text{horizontal}}$$

单行字符的物理占宽估算函数基于混合字形进行加权累加：
$$\text{EstimatedTextWidth} = \sum_{i=1}^{N} \text{GlyphWidth}(char_i, \text{FontSize})$$

其中字宽经验参数为：
$$\text{GlyphWidth}(char_i, \text{FontSize}) \approx \begin{cases} \text{FontSize}, & char_i \in \text{CJK / 全角标点} \\ 0.55 \times \text{FontSize}, & char_i \in \text{ASCII / 半角英数} \end{cases}$$

当 $\text{EstimatedTextWidth} > \text{AvailableWidth}$ 发生溢出时，排版引擎按严格序列执行三级代偿：

1. **第一代偿：文案修剪（Pruning）**  
   在保持核心技术术语完整的前提下，剔除修饰性字符（例如将“用户权限认证管理数据传输通道”精炼为“权限认证传输通道”）。
2. **第二代偿：显式折行（Explicit Wrapping）**  
   若修剪后仍超出，基于累加字符宽度计算分词断点，将单行 `<text>` 转换为多行 `<tspan>` 结构：
   ```xml
   <!-- 首行锚定基线，后续行使用相对字阶行高 dy="1.35em" 递增 -->
   <text x="20" y="35" font-size="12" fill="#e2e8f0">
     <tspan x="20" dy="0">数据接入网关层</tspan>
     <tspan x="20" dy="1.35em">(TLS双向认证模式)</tspan>
   </text>
   ```
3. **第三代偿：容器几何外扩与全局级联（Geometric Cascading）**  
   当折行后的总行高超出预设容器高度时，同步外扩外层 `<rect>` 的高度：
   $$H_{\text{new}} = H_{\text{old}} + \Delta H$$
   同时重新计算该节点下方所有关联图元的 $Y$ 轴偏移量，并最终级联刷新顶层画布的视窗尺寸：
   $$H_{\text{canvas}} \leftarrow \max\left(H_{\text{canvas}}, \max_i(Y_i + H_i + \text{Padding}_{\text{bottom}})\right)$$

整个过程严格锁定 $\text{FontSize} \ge 12\text{px}$，宁可扩展画布与重算拓扑，绝不妥协字阶。

---

## 6. 确定性门禁：从正则扫描到 XML DOM 语义解析

治理机制能够长期运转，关键在于防线由不可靠的“提示词约定”转化为“机器确定性拦截”。

过去许多方案使用单行正则表达式（如 `grep "font-size:[0-9]px"`）进行代码审查，极易被多行样式、属性继承、类名映射或缩进换行绕过。为此，系统确立了基于真实 DOM 计算树的双重拦截机制。

![基于 XML DOM 与 AST 语义解析的确定性质量门禁时序](/assets/img/typography-quality-gate-sequence.svg)

在矢量领域，质检脚本 `validate_svg.py` 基于 Python 内置的 `xml.etree.ElementTree` 实现：
- 递归解析 `<g>` 标签的 `font-size` 继承关系；
- 解析内联 `style="font-size: ..."` 与直接属性 `font-size="..."`；
- 对具备微观密集趋势图豁免属性（`data-allow-micro-font="true"`）的特定图元放行；
- 其余任何常规文本节点若计算字号低于 12px，直接返回非零退出码并打回生成流程。

在 Web 领域，通过注入针对 CSS 的 Stylelint 规则以及对 JS 图表 AST 的扫描插件，将 `fontSize: 9` 列为致命语法错误，从源头阻断违规代码流入主干。

---

## 7. 落地路径与演进策略

建立跨媒介的排版防腐体系，建议按照以下三个阶段稳步推进：

### 阶段一：宪法确立与质检工具止血（立即生效）
- **全局规则锁定**：在全局环境配置文件（如 `GEMINI.md` 或等价的全局系统规则）的编程规范章节中，明确加入 `UI & Typography Readability Floor` 约束，严禁生成小于 12px 的字号常数与缩放 hack（如 `transform: scale(<1.0)`）；
- **门禁挂接**：将基于 XML DOM 解析的 `validate_svg.py` 部署至工具链，确保所有矢量生成任务在交付前通过机器自检。

### 阶段二：建立单一真相源设计资产（项目级铺设）
- 在各业务工程根目录下初始化 `design-tokens.json`（或 `design-tokens.yaml`），显式固化中性色阶、主色系、辅助色与阶梯字阶表；
- 编写或集成轻量派生脚本，确保在项目构建或初始化阶段，自动由 JSON 派生出 `src/styles/tokens.css` 与 `src/utils/chartTheme.js`，消除组件与图表代码中的裸写数字。

### 阶段三：双全局脚手架驱动的生命周期治理（长期演化）
- 确立 `web-theme-curator` 与 `svg-skill-curator` 双脚手架分工模式：日常业务需求由通用 `/builder` 承接，当面临新项目立项或全局风格升级时，调度 Curator 技能自动化完成项目局部资产的初始化与版本漂移审计（Audit & Sync）；
- 保持各层级职责内聚：审查者只管门禁阻断，生成引擎内聚几何重排，算法脚本保障确定性，摆脱“提示词靠天吃饭”的经验主义生成模式。
