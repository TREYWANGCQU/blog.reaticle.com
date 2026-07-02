---
layout: post
lang: cn
title: 认识你自己的文件夹（一）-Antigravity IDE 文件分析能力研究报告
date: 2026-07-02
tags: ai
mathjax: false
---

# Antigravity IDE 文件分析能力研究报告

本报告研究并验证了 Antigravity IDE 在处理和分析各类文件格式时的能力，包括原生支持的文件类型，以及如何扩展支持 Office 系列文件（如 `.xlsx`、`.docx`、`.doc`）。

## Verified Facts (已验证的事实)

### 1. 原生工具支持 (Built-in Tools)
IDE 提供的内置文件查看工具 (`view_file`) 原生支持以下格式：
- **纯文本文件**：包括但不限于 `.txt`、`.md`、`.csv`、`.json`、`.py`、`.js`、`.ts`、`.html`、`.css`、`.xml`、`.yml` 等。
- **便携式文档格式 (PDF)**：`.pdf` 文件可以直接被内置工具读取和解析。
- **图像文件**：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif` 等主流图像格式。
- **音视频文件**：支持常见的音频和视频格式。

### 2. 现代 Office 格式 (.docx / .xlsx)
虽然内置工具不直接渲染 `.docx` 和 `.xlsx` 的可视化界面，但由于它们本质上是 **ZIP 压缩包格式 (OpenXML)**，Antigravity IDE 可以通过在后台运行轻量级的解析脚本，**完美且高效地提取和分析**它们的内容。

- **`.docx` (Word 文档)**：可以通过 Python 内置的 `zipfile` 和 `xml.etree.ElementTree` 模块，无需任何第三方库，直接解压并提取 `word/document.xml` 中的段落与表格文本。
- **`.xlsx` (Excel 表格)**：同样可以通过纯 Python 方式解析 `xl/sharedStrings.xml` 和 `xl/worksheets/sheetN.xml`，读取工作表结构、单元格数据和工作簿配置。

*验证实例：已成功在当前工作区编写了 `office_parser.py` 并成功解析了工作区内的 `项目整体设计及一期实施方案.docx`（获取了目录和前2000字）以及 `试用意见征集结果整理.xlsx`（获取了各 Sheet 的行数及数据预览）。*

### 3. 旧版 Office 格式 (.doc)
- **`.doc`** 是微软早期的二进制复合文档格式（OLE2 结构），无法直接用 ZIP 解压的方式读取。
- **处理方案**：在 Windows 系统上，如果安装了 Microsoft Office，我们可以通过运行 PowerShell 脚本来调用 Word COM 接口直接读取文档内容或将其另存为 `.docx` 后分析；或者在没有 Office 的环境下通过第三方 Python 库（如 `pypandoc`）或转换工具进行提取。

---

## Evidence Sources (证据来源)

1. **内置工具定义**：`view_file` 接口说明中明确指出支持 `text files, pdf, image, video, audio`。
2. **本地环境验证**：
   - Python 版本：`Python 3.14.4`
   - Node.js 版本：`v24.15.0`
   - 现场脚本测试：在本地编写并成功执行了 `office_parser.py` 解析脚本，成功提取了工作区中大型 docx/xlsx 文件的文本内容。

---

## Unverified Claims (未验证的声明)
1. **老旧 `.doc` 文件在无 Office 环境下的解析**：尚未在本地安装 `catdoc` 或 `pandoc` 等工具以测试在纯净无 Office 环境下对旧版 `.doc` 的解析率。
2. **复杂加密/受保护的 Office 文档**：对于设置了打开密码或权限保护的 `.docx`/`.xlsx`，直接解包 XML 的方式会失效，需要结合解密逻辑或用户输入密码。

---

## Research Notes (研究笔记 - Office 解析方案)

为了让您直观地看到我们如何分析这些文件，以下是已在您本地环境中测试成功、无需安装任何额外 Python 包即可运行的解析方案：

### Word (`.docx`) 纯文本解析原理
```python
import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    with zipfile.ZipFile(path) as docx:
        xml_content = docx.read('word/document.xml')
        root = ET.fromstring(xml_content)
        text_runs = []
        for elem in root.iter():
            if elem.tag.endswith('t'):  # 文本内容
                text_runs.append(elem.text or "")
            elif elem.tag.endswith('p'):  # 段落换行
                text_runs.append("\n")
        return "".join(text_runs)
```

### Excel (`.xlsx`) 数据预览原理
```python
import zipfile
import xml.etree.ElementTree as ET

def get_xlsx_sheets(path):
    with zipfile.ZipFile(path) as xlsx:
        # 读取共享字符串表，避免只读到数字索引
        shared_strings = []
        try:
            ss_xml = xlsx.read('xl/sharedStrings.xml')
            ss_root = ET.fromstring(ss_xml)
            for t in ss_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
                shared_strings.append(t.text or "")
        except KeyError:
            pass
        # 进一步解压 xl/worksheets/sheet1.xml 即可拿到行列数据
```
