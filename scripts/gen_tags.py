# gen_tags.py
import os
import yaml
import re
import unicodedata

POST_DIR = "_posts"
TAG_DIR = "tag"

# -----------------------------------
# slugify 函数：把 tag 转成 URL 友好格式
# 中文保留原文，空格 -> -
# 英文、数字小写化
# 其他特殊字符去掉
# -----------------------------------
def slugify(tag):
    tag = tag.strip()
    # 替换空格为 -
    tag = tag.replace(" ", "-")
    # 去掉大部分特殊字符，只保留中文、字母、数字、-
    tag = re.sub(r"[^\w\-一-龥]", "", tag)
    return tag.lower()

# -----------------------------------
# 遍历 _posts 收集所有 tag
# -----------------------------------
tags = set()

for fname in os.listdir(POST_DIR):
    if not fname.endswith(".md"):
        continue
    with open(os.path.join(POST_DIR, fname), "r", encoding="utf-8") as f:
        content = f.read()
        if content.startswith("---"):
            # 提取 front matter
            front_matter = content.split("---", 2)[1]
            meta = yaml.safe_load(front_matter)
            raw_tags = meta.get("tags", [])
            if isinstance(raw_tags, str):
                raw_tags = [raw_tags]
            for t in raw_tags:
                tags.add(t.strip())

# -----------------------------------
# 创建 tag 目录
# -----------------------------------
os.makedirs(TAG_DIR, exist_ok=True)

# -----------------------------------
# 为每个 tag 生成 tag 页
# -----------------------------------
for tag in tags:
    slug = slugify(tag)
    tag_path = os.path.join(TAG_DIR, f"{slug}.md")
    with open(tag_path, "w", encoding="utf-8") as f:
        f.write(f"""---
layout: tagpage
tag: {tag}
permalink: /tag/{slug}/
---
""")

print(f"✅ Generated {len(tags)} tag pages in '{TAG_DIR}' folder.")
