# 前端 Mermaid 图表渲染支持方案

> **状态**：方案分析（Analyzer Output / Pending Approval）  
> **目标仓库**：`blog.reaticle.com`（Jekyll + Kramdown + Rouge + GitHub Pages）  
> **文档路径**：`docs/feats/frontend-mermaid-support.md`  
> **日期**：2026-11-24

---

## 1. Goal Description（目标与硬边界）

### 1.1 Objectives（目标范围）

为 `blog.reaticle.com` 静态博客前端引入确定性、零日常性能损耗、与现有青绿浅色主题视觉统一、且兼容存量文章的 Mermaid 图表渲染能力，使 Markdown 中的 ```` ```mermaid ```` 代码块在浏览器端自动渲染为高可读性矢量 SVG 图表。

**核心业务痛点（已核实事实）**：
- 站点 `_posts/` 中已存在 **5 篇文章、共 8 处** ```` ```mermaid ```` 代码块（涵盖 `graph TD`、`graph LR`、`flowchart TD`、`flowchart TB`、`sequenceDiagram` 及 `subgraph` / `autonumber` / 中文标签），当前在前端仅退化为普通代码块文本显示。
- 这 5 篇存量文章的 Front Matter **均未声明** `mermaid: true` 开关（仅声明了 `mathjax: true/false`）。

### 1.2 Constraints & Hard Boundaries（约束与物理边界契约）

| 边界维度 | 物理 / 协议硬约束 | 架构含义 |
| :--- | :--- | :--- |
| **构建与托管边界** | Jekyll（`gem "github-pages"`）+ `markdown: kramdown` + `highlighter: rouge`；CI 为 GitHub Actions（`.github/workflows/ci.yaml`）构建后部署至 GitHub Pages（含 `.nojekyll`） | 不引入自定义 Ruby 插件（保持 `github-pages` 安全模式兼容）；不强绑定 Node/Puppeteer 构建链，避免 CI 膨胀与字体渲染差异。 |
| **DOM 契约边界** | Kramdown + Rouge 将 ```` ```mermaid ```` 编译为 `<div class="language-mermaid highlighter-rouge"><div class="highlight"><pre class="highlight"><code>...</code></pre></div></div>`（无 Rouge 包裹时为 `<pre><code class="language-mermaid">...</code></pre>`），且对 `-->` / `"` 做 HTML 实体转义及 `<span>` 词法包裹 | **禁止**直接对 `.language-mermaid` 调用 `mermaid.run()`；必须先经前端 DOM 归一化：提取 `code.textContent`（浏览器自动还原实体与剥离 `<span>`），替换为纯净的 `.mermaid` 容器后再触发渲染。 |
| **布局与层叠上下文边界** | `_sass/jekyll-theme-minimal.scss` 中主内容区 `<section>` 桌面端宽 `810px`（`<=1300px` 为 `60%`，`<=960px` 为 `auto`），背景 `#dfe6e6`，且带有 `animate__animated animate__fadeInUp`（动画期含 CSS `transform`） | 宽图（如 `graph LR`、`sequenceDiagram`）不能强制等比缩放压扁文字；若提供点击放大（Lightbox），弹层 DOM **必须挂载于 `document.body`**，避免被 `<section>` 的 `transform` 层叠上下文截断。 |
| **排版可读性生理底线** | 渲染后的所有 SVG 文本（节点标签、边标签、子图标题、时序图角色与注释）严格遵守 `font-size >= 12px`；严禁使用 `transform: scale(<1.0)` 缩小 SVG 来硬塞进 `810px` 容器 | 空间拥挤严格通过容器横向滚动（`overflow-x: auto`）+ 可选全屏查看（Lightbox）代偿，确保移动端与桌面端字号始终 `>= 12px`（基准 `14px`）。 |
| **安全与降级边界** | Mermaid 渲染可能因语法错误或 CDN 不可达（中国大陆网络波动）失败 | 1) 强制 `securityLevel: 'strict'`（防止 XSS）；2) 采用单块独立渲染 + `try/catch` 隔离，单图语法错误不得阻断同页其他图表，且失败时回退展示原始源码与错误提示；3) CDN 加载失败时保留原始代码块可读性（渐进增强，不白屏）。 |

---

## 2. Fact Grounding & Prerequisites（事实锚定与前置验证）

### 2.1 Verified Local Facts（已核实本地事实）

以下事实均已直接核查仓库源码确认：

1. **构建配置**（`_config.yml`）：`markdown: kramdown`、`highlighter: rouge`、`keep_files: [assets, tag, CNAME, .nojekyll]`、`timezone: Asia/Shanghai`。
2. **模板继承链**：`_layouts/post.html` 与 `_layouts/page.html` 均继承 `_layouts/default.html`。`_layouts/default.html` L29–33 已采用 `{% if page.mathjax %}` 在 `</body>` 前按需加载外部脚本。
3. **现存模板技术债**（`_layouts/default.html`）：**L18 与 L34 存在两处孤立的多余 `</script>` 闭合标签**，实施时应一并清理，防止 HTML 解析异常。
4. **样式与色彩体系**（`_sass/jekyll-theme-minimal.scss`）：
   - 页面渐变背景：`#005353` → `#008b8b`
   - 内容卡片底色：`#dfe6e6`，正文主色 `#001515`，标题/强调色 `#008b8b`，次要元信息 `#006464`，分割线/代码块底色 `#bfcbcb`
   - 字体栈：正文 `"Noto Sans", Arial, "Microsoft YaHei", "微软雅黑", sans-serif`（`15px/1.6`）；代码 `"Hack", "STXihei", "华文细黑", sans-serif`
   - 当前无暗黑模式切换，属于单一青绿浅色系主题。
5. **存量 Mermaid 文章清单**（5 篇 / 8 块）：
   - `_posts/2026-07-02-on-context-2.md`（L47：`graph TD`）
   - `_posts/2026-08-16-industrial-ai-music-pipeline.md`（L58：`graph TD`；L90：`graph LR`）
   - `_posts/2026-09-03-agent-workflow-anti-drift-and-circuit-breaker.md`（L22：`flowchart TD`；L54：`sequenceDiagram`）
   - `_posts/2026-09-03-headscale-practice-version-drift.md`（L101：`flowchart TD`；L152：`sequenceDiagram`）
   - `_posts/2026-11-24-global-skills-parallel-orchestration-architecture.md`（L50：`flowchart TB`）

### 2.2 Verified External Facts（已核实外部事实）

1. **Mermaid v11 ESM 规范**：官方支持通过 ESM 模块引入（如 jsDelivr `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs`），提供 `mermaid.initialize({ startOnLoad: false, securityLevel, theme, themeVariables, ... })` 与异步 `mermaid.run({ nodes })` / `mermaid.render(id, definition)` API。
2. **安全级别**：Mermaid v11 中 `securityLevel: 'strict'` 会对节点内的 HTML 标签进行编码并禁用 click 事件，适合静态博客默认安全基线。

### 2.3 Prerequisites Before Implementation（编码落地前需补齐的核验项）

- **[Requires /collector — 本地实测项]**：当前本地工作区无 `_site/` 编译产物；编码阶段需执行一次 `bundle exec jekyll build`，抽检上述 5 篇文章之一生成的 HTML，**实测确认** Rouge 对 ```` ```mermaid ```` 的精确 DOM 包裹结构（验证 `div.language-mermaid.highlighter-rouge` 与 `pre > code.language-mermaid` 两种形态是否同时存在）。
- **[Requires /researcher — 外部版本锁定项]**：落地前锁定 Mermaid v11 的具体最新稳定小版本号（如 `mermaid@11.x.x`，避免 `@11` 漂移导致未来破坏性变更），并核实 `mermaid.render(id, source)` 在 v11 中的返回值签名（`{ svg, bindFunctions }`）及中文 `\n` 换行在 `flowchart` 标签中的解析行为（注意 `_posts/2026-11-24-...md` L52 等处使用了双引号内 `\n`）。
- **Unverified Assumptions（待验证假设声明）**：
  - *假设 A*：中国大陆访客访问 `cdn.jsdelivr.net` 偶发超时。**防御策略**：方案内置主/备 CDN 自动回退（jsDelivr → unpkg / esm.sh）或支持未来一键切换为本地自托管（`assets/js/vendor/`）。
  - *假设 B*：`_posts/2026-11-24-...md` 中的 `Start(["用户发起任务"])` 及多行 `\n` 语法在 Mermaid v11 `strict` 模式下可正常解析。**防御策略**：验收阶段必须覆盖全部 5 篇存量文章的 8 张图表实测渲染。

---

## 3. Proposed Changes（架构设计与实施方案）

### 3.1 Architecture Options & Trade-off Analysis（方案对比与选型）

| 评估维度 | 方案 A：构建期预渲染（CI 运行 `mermaid-cli` + Puppeteer） | 方案 B：前端手动开关加载（`page.mermaid: true` + 静态 `<script>`） | **方案 C：前端按需自动探测 + ESM 动态导入（推荐）** |
| :--- | :--- | :--- | :--- |
| **对 CI 与仓库体积影响** | 高（CI 需安装 Node + Chromium/Puppeteer + 中文字体，构建时长显著增加） | 极低（纯前端，零 CI 改动） | **极低（纯前端，零 CI 改动）** |
| **存量 5 篇文章兼容性** | 自动兼容 | **差**（需手动回填 5 篇 Front Matter，且未来每篇都可能漏写） | **自动兼容**（零 Front Matter 改造，且保留 `mermaid: false` 强制关闭逃生舱） |
| **无图页面的性能开销** | 零 JS 开销 | 零 JS 开销 | **零 Mermaid 资源下载**（仅当页面存在 `.language-mermaid` 时才触发动态 `import()`，无图页零网络请求） |
| **样式/字体一致性** | 依赖 CI 容器中文字体，易与浏览器实际字体漂移 | 与浏览器页面字体原生一致 | **与浏览器页面字体原生一致**（直接继承 `Noto Sans` / `Microsoft YaHei`） |
| **故障容错与可维护性** | 构建失败会阻断整站发布 | 单图报错可能影响整页渲染 | **单图独立 `mermaid.render()` + 失败优雅降级回源码** |

**结论**：选定 **方案 C（前端按需自动探测 + Mermaid v11 ESM 动态导入 + 单图隔离渲染）**。

---

### 3.2 System Decomposition & Data Flow（模块解耦与数据流模型）

将渲染链路严格切分为 **4 个职责正交的轻量模块**，遵循现有 Jekyll 架构约定：

```
[Markdown 源码: ```mermaid]
       │  (Jekyll / Kramdown / Rouge 构建期)
       ▼
[静态 HTML: div.language-mermaid / pre > code.language-mermaid]
       │  (Liquid 门禁: _includes/mermaid.html)
       │  条件: page.mermaid != false AND content contains 'language-mermaid'
       ▼
[按需挂载 <script type="module" src="/assets/js/mermaid-init.js">]
       │  (浏览器 DOMContentLoaded)
       ▼
┌────────────────────────────────────────────────────────────────┐
│ assets/js/mermaid-init.js（前端渲染控制器）                      │
│  1. DOM 探测与归一化：定位所有 mermaid 代码块，读取 textContent  │
│  2. 懒加载引擎：动态 import() Mermaid v11 ESM（带主/备 CDN 回退）│
│  3. 主题初始化：注入青绿浅色 themeVariables + fontSize >= 14px   │
│  4. 单图隔离渲染：逐块调用 mermaid.render(id, source)            │
│     ├─ 成功：替换为 .mermaid-container（含滚动容器 + 放大按钮）   │
│     └─ 失败：保留原始 <pre><code> + 顶部轻量语法错误提示条       │
│  5. 交互增强：挂载于 document.body 的轻量 Lightbox 放大查看器    │
└────────────────────────────────────────────────────────────────┘
       │
       ▼
[_sass/_mermaid.scss（经 style.scss / jekyll-theme-minimal.scss 引入）]
  - 容器卡片视觉对齐（背景 #edf2f2、边框 #bfcbcb、圆角 5px）
  - 横向滚动防溢出 + SVG 文本字号底线保护（>= 12px）
  - Lightbox 遮罩层与工具栏样式（适配桌面/移动端）
```

#### 关键设计细节

1. **双层零开销门禁（Liquid + JS）**：
   - **构建期门禁**（`_includes/mermaid.html`）：仅当 `page.mermaid != false` 且 `content contains 'language-mermaid'` 时，才在 `</body>` 前输出 `<script type="module" src="{{ '/assets/js/mermaid-init.js' | relative_url }}"></script>`。这意味着全站 90%+ 不含 Mermaid 的页面（首页、列表页、普通文章）**连初始化脚本都不会加载**，真正零开销。
   - **逃生舱支持**：若某篇文章需要演示 Mermaid 原始语法而不希望被渲染，仅需在 Front Matter 中声明 `mermaid: false` 即可跳过渲染。
2. **CDN 容错策略**：
   - 在 `mermaid-init.js` 中定义有序 ESM 源列表：
     1. 主源：`https://cdn.jsdelivr.net/npm/mermaid@<pinned-version>/dist/mermaid.esm.min.mjs`
     2. 备源：`https://unpkg.com/mermaid@<pinned-version>/dist/mermaid.esm.min.mjs`（或 `esm.sh`）
   - 依次 `try { return await import(url); } catch {}`；若全部不可达，静默保持原始代码块可读并在控制台输出 `warn`，绝不破坏页面原有阅读体验。
3. **视觉主题映射契约（对齐 `_sass/jekyll-theme-minimal.scss`）**：
   - 使用 `theme: 'base'` + 定制 `themeVariables`，使图表与 `#dfe6e6` 卡片及 `#008b8b` 青绿主色浑然一体：
     - `fontFamily`: `'"Noto Sans", Arial, "Microsoft YaHei", "微软雅黑", sans-serif'`
     - `fontSize`: `'14px'`（严格高于 `12px` 生理底线）
     - `primaryColor`: `'#eef4f4'`（节点浅底色，高于 `#dfe6e6` 卡片形成层次）
     - `primaryTextColor`: `'#001515'`（与正文主色一致，高对比度）
     - `primaryBorderColor`: `'#008b8b'`（与标题/强调色一致）
     - `lineColor`: `'#006464'`（连线与箭头色，与 `.meta` 深青一致）
     - `secondaryColor`: `'#d4e2e2'`（子图/次级节点底色）
     - `tertiaryColor`: `'#f5f8f8'`（Cluster/Subgraph 容器底色）
     - `noteBkgColor`: `'#edf4f4'` / `noteBorderColor`: `'#008b8b'`（时序图注释）
   - `flowchart: { htmlLabels: true, useMaxWidth: false }` 与 `sequence: { useMaxWidth: false }`：**关键参数说明**——设置 `useMaxWidth: false` 可防止 Mermaid 将宽图强行等比缩小塞进 `810px` 导致字体跌破 `12px`；配合 CSS `overflow-x: auto` 容器，窄图居中完整展示，宽图保持清晰原字号并支持横向平滑滚动及一键全屏放大。
4. **轻量交互增强（可选但强烈推荐）**：
   - 每个渲染完成的 `.mermaid-container` 右上角提供简洁的「放大查看 / 源码切换」轻量按钮（字号 `>= 12px`）：
     - **放大查看（Lightbox）**：点击后在 `document.body` 下打开全屏半透明遮罩层展示 SVG（支持 `ESC` 键或点击遮罩关闭），完美解决 `810px` 栏宽阅读大型架构图/时序图的痛点。
     - **源码切换**：方便读者复制或核对 Mermaid 定义，同时也作为渲染异常时的自然降级视图。

---

### 3.3 Work Breakdown Structure（WBS 与文件影响清单）

| 阶段 | 任务 | 目标文件 | 操作类型 | 核心职责 |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | 清理模板孤立标签并挂载按需 Include | `_layouts/default.html` | 修改 | 清理 L18、L34 多余 `</script>`；在 MathJax 区块后引入 `{% include mermaid.html %}` |
| **Phase 1** | 新增 Liquid 按需门禁片段 | `_includes/mermaid.html` | 新增 | 实现 `page.mermaid != false` 且 `content contains 'language-mermaid'` 条件判断与模块化脚本加载 |
| **Phase 2** | 实现前端渲染控制器 | `assets/js/mermaid-init.js` | 新增 | DOM 探测与归一化、主/备 CDN ESM 动态导入、青绿主题配置、单图隔离渲染、错误降级、Body 级 Lightbox 交互 |
| **Phase 3** | 新增 Mermaid 专属样式表并汇入主样式 | `_sass/_mermaid.scss`、`_sass/jekyll-theme-minimal.scss` | 新增 / 修改 | 定义 `.mermaid-container`、横向滚动、字号底线（`>= 12px`）、错误提示条及 Lightbox 样式；在主 SCSS 中 `@import "mermaid";` |
| **Phase 4** | 本地构建与存量 5 篇文章全量回归验收 | 无代码改动（构建 `_site/` 验证） | 验证 | 覆盖全部 5 篇存量文章 8 张图表的渲染、响应式、字号底线与无图页零加载验收 |

### 3.4 Execution Topology Recommendation（编排拓扑建议）

- **推荐拓扑**：**`Single`（默认单会话串行流 `/builder` -> `/verifier`）**。
- **判定理由**：本需求为单一前端功能模块，仅涉及 4 个强关联小文件（HTML Include、JS 控制器、SCSS 样式、Layout 挂载），文件写域高度耦合且总工作量轻，**不满足多 Agent 并行编排的 4 项触发阈值**。保持单会话串行推进成本最低、一致性最高。

---

## 4. Verification Plan（验收标准与质量门禁）

### 4.1 Hard Acceptance Criteria（硬验收门禁）

1. **零开销验证（无图页面）**：
   - 打开任意不含 Mermaid 的文章（如 `_posts/2026-11-23-on-passes-and-market-...md`）与首页，检查 HTML 源码与 DevTools Network 面板：页面中**不存在** `mermaid-init.js` 标签，且**无**任何 `mermaid` 相关网络请求。
2. **存量全量兼容验证（5 篇 / 8 图）**：
   - 本地 `bundle exec jekyll serve` 逐一打开以下 5 篇文章，确认全部 8 张图表正常渲染为 SVG，无报错、无文字截断、无节点重叠：
     - `2026-07-02-on-context-2`（1 张 `graph TD`）
     - `2026-08-16-industrial-ai-music-pipeline`（1 张 `graph TD` + 1 张 `graph LR`）
     - `2026-09-03-agent-workflow-anti-drift-and-circuit-breaker`（1 张 `flowchart TD` + 1 张 `sequenceDiagram`）
     - `2026-09-03-headscale-practice-version-drift`（1 张 `flowchart TD` + 1 张 `sequenceDiagram`）
     - `2026-11-24-global-skills-parallel-orchestration-architecture`（1 张 `flowchart TB`，重点核查多行 `\n` 标签渲染）
3. **排版可读性底线验证（Hard Floor）**：
   - 在桌面端（`1440px`）与移动端（`390px`）视口下，通过 DevTools Computed Style 抽检渲染后 SVG 内文本节点与工具栏按钮的计算字号，均满足 `>= 12px`；宽图触发容器横向滚动而非缩放压缩文字。
4. **逃生舱与故障降级验证**：
   - 临时测试 `mermaid: false` 页面：代码块保持原样高亮不触发渲染。
   - 临时构造 1 处错误 Mermaid 语法与 1 处正常图表同页共存：错误块展示源码与错误提示，正常块不受影响照常渲染。
   - 在 DevTools 中屏蔽主 CDN 域名：自动切换至备用 CDN 成功渲染；同时屏蔽主备 CDN：静默保留原始代码块可读，无未捕获 Promise 异常。
5. **交互与层叠验证**：
   - 点击「放大查看」打开 Lightbox，确认弹层覆盖整个视口（不受 `<section>` 动画/宽度限制），按 `ESC` 或点击遮罩可正常关闭。
6. **CI 构建兼容验证**：
   - `JEKYLL_ENV=production bundle exec jekyll build` 退出码为 `0`，无 SCSS 编译警告与 Liquid 语法错误。

---

## 5. Open Decisions（待确认项）

以下两项为轻量可选决策，若无特殊偏好将按**推荐项**直接进入 `/builder` 落地：

1. **资源托管方式**：
   - **推荐**：jsDelivr 主源 + unpkg 备源（锁定 Mermaid v11 精确小版本，仓库零体积膨胀）。
   - **备选**：将 `mermaid.esm.min.mjs` 及分包自托管至 `assets/js/vendor/`（彻底消除外网 CDN 依赖，但会增加仓库体积与后续升级维护成本）。
2. **图表交互工具栏**：
   - **推荐**：内置轻量「放大查看（Lightbox）+ 查看源码」按钮（纯原生 JS/CSS，无第三方依赖）。
   - **备选**：仅做纯静态 SVG 渲染 + 横向滚动（极简零交互）。
