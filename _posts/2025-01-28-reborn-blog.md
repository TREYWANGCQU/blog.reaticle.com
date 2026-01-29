---

layout: post
lang: cn
title: 重启自动化博客：把精力只交给思考
date: 2026-01-28
tags: [github, ai]
mathjax: true


---

因为各种各样的原因，停更了好久好久，我重新发现了自己的博客！问题逐渐清晰：**写作本身并不复杂，复杂的是围绕写作的那一整套维护流程**。字体、标签、构建、发布，这些本应“透明存在”的事情，长期占据了注意力”。

这次重启博客，给也一个朴素的目标：

> 让博客系统退到后台，让注意力只给思考本身。

## 一、为什么要重构博客流程

5年前了，博客方案高度依赖本地环境：

- 中文字体压缩依赖 FontSpider
- tag 页面靠手动或零散脚本维护
- 换一台电脑，就要重新搭环境
- Windows 下的使用体验尤为割裂

这些问题并不致命，但会持续消耗心力。  
当维护成本开始高于写作成本，博客自然会停下来。


## 二、升级中文字体压缩：从“本地工具”到“构建环节”

### 1. 放弃 FontSpider

FontSpider 在早期解决了中文 Web 字体的实际问题，但在长期使用中逐渐显现出局限：

- 对本地 Node 环境依赖较重
- CLI 解析 HTML 的稳定性一般
- 与 CI 的协作成本偏高

更关键的一点在于：**字体子集化本身属于构建行为，而不是写作行为。**

### 2. 新方案：GitHub Actions + fonttools

现在的做法是：

1. 本地只保留完整字体文件
2. GitHub Actions 构建时：
   - 扫描生成后的 HTML
   - 提取实际出现的字符
   - 使用 `pyftsubset` 生成 woff2 子集字体
3. 自动发布到 GitHub Pages

调整之后，本地写作流程变得非常简单，只剩下：
```bash
git push
```

## 三、tag 自动生成：让结构成为派生结果
### 1. pages-themes/minimal 的现实约束

在 GitHub Pages 环境下使用 pages-themes/minimal，意味着：

1. 无法使用自定义 Jekyll 插件
1. 官方不提供 tag 页面生成机制
1. Ruby 侧的扩展空间有限

### 2. 使用 Python 生成 tag 页面

在构建前，通过一个 Python 脚本完成三件事：

1. 扫描 _posts/*.md

2. 解析 Front Matter 中的 tags

1. 自动生成 tag/*.md

1. 形如tags:[github, ai] _全部小写，无特殊符号_

这些生成的 tag 页面本质上是普通 Markdown 文件，Jekyll 可以直接渲染，无需任何插件支持。


## 四、启示

这次调整过程中，逐渐形成了一个清晰的认识：

博客系统本身，也应当遵循工程化思维。

在这样的视角下：

- Markdown 是源数据

- 页面、字体、tag 都是构建产物
- 人负责表达，机器负责派生

一旦角色边界清晰，很多纠结自然消失。
写作不再被环境、工具或配置打断。

最终留下的，只需要两件事：

> 1 持续思考，以及把思考记录下来。

> 2 其余工作，交给自动化即可。



### 补遗1
特别注意构建路径:```_config.yaml``` 问题：
```yaml
include:
  - _pages
  - tag  
keep_files:
  - assets
  - tag
exclude:
  - scripts/
  - vendor/
  - Gemfile
  - Gemfile.lock
  - node_modules/
  - "*.gem"
  - "*.gemspec"
  - LICENSE
  - README.md
  # 不要排除 assets!
```


### 补遗2：GitHub Actions 工作流
``` yaml
on:
  push:
    branches: [mine]  # 或你的默认分支
  pull_request:
    types: [opened, synchronize]

# 添加权限
permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # 1️⃣ 拉代码
      - uses: actions/checkout@v4
      
      # 2️⃣ Ruby（Jekyll）
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true
      
      # 3️⃣ Python（tag + 字体）
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      
      - name: Install Python deps
        run: |
          pip install fonttools pyyaml brotli
      
      # 4️⃣ 生成 tag 页面（在 Jekyll build 前）
      - name: Generate tag pages
        run: |
          python scripts/gen_tags.py
          ls -la tag/ || ls -la _site/tag/ || echo "Tag directory not found"
     
      # 5️⃣ 字体子集化
      - name: Subset Chinese font
        run: |
          find . \( -name "*.md" -o -name "*.html" -o -name "*.yml" \) -print0 \
            | xargs -0 cat \
            | sed 's/<[^>]*>//g' \
            | tr -d '\n' \
            | sort -u \
            > all-text.txt
          pyftsubset assets/fonts/fontSource/YangRenDongZhuShiTi.ttf \
            --text-file=all-text.txt \
            --output-file=assets/fonts/YangRenDongZhuShiTi.woff2 \
            --flavor=woff2 \
            --layout-features='*' \
            --with-zopfli
            ls -lh assets/fonts/YangRenDongZhuShiTi.woff2

      #  6️⃣Jekyll 构建
      - name: Build with Jekyll
        run: bundle exec jekyll build
        env:
          JEKYLL_ENV: production
      


       # 7️⃣ 验证构建产物
      - name: Verify build output
        run: |
          echo "=== Checking tag directory ==="
          ls -la _site/tag/ || echo "⚠️  No tag directory in _site"
          
          echo "=== Checking fonts directory ==="
          ls -la _site/assets/fonts/ || echo "⚠️  No fonts directory in _site"
          
          echo "=== Site structure ==="
          find _site -type f -name "*.woff2" -o -type d -name "tag"


      # 8️⃣上传构建产物
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
       

  # 部署任务
  deploy:
    if: github.ref == 'refs/heads/mine'  # 只在主分支部署
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```