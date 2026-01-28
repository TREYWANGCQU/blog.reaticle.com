from pathlib import Path
import yaml
import re
import shutil

POST_DIR = Path("_posts")
TAG_DIR = Path("tag")

def slugify(text: str) -> str:
    """
    生成 URL / 文件安全的 tag 名
    中文保留，其他非法字符转 -
    """
    text = text.strip()
    text = re.sub(r"[^\w\u4e00-\u9fff]+", "-", text)
    return text.strip("-")

# 确保 tag 目录干净
if TAG_DIR.exists():
    shutil.rmtree(TAG_DIR)
TAG_DIR.mkdir(parents=True, exist_ok=True)

total_tags = set()

for post in POST_DIR.glob("*.md"):
    with post.open("r", encoding="utf-8") as f:
        content = f.read()

    if not content.startswith("---"):
        continue

    try:
        _, fm, _ = content.split("---", 2)
        meta = yaml.safe_load(fm) or {}
    except Exception:
        continue

    tags = meta.get("tags", [])
    if isinstance(tags, str):
        tags = [tags]

    for tag in tags:
        total_tags.add(tag.strip())

for tag in sorted(total_tags):
    slug = slugify(tag)
    tag_file = TAG_DIR / f"{slug}.md"

    tag_file.write_text(
        f"""---
layout: tagpage
title: "Tag: {tag}"
tag: {tag}
robots: noindex
---

""",
        encoding="utf-8"
    )

print(f"Tags generated: {len(total_tags)}")
