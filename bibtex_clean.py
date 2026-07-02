#!/usr/bin/env python3
"""清理 BibTeX 文件的指定字段。

1. 将 author 字段中的 ';' 替换为 ' and '。
2. 从 number 字段中移除 '第' 和 '期'。

其余行保持不变。
"""

import re
import sys
from pathlib import Path

INPUT_PATH = Path("/home/ouyangjiahong/Downloads/1.bib")
OUTPUT_PATH = Path("/home/ouyangjiahong/Downloads/1_modified.bib")


def transform_author_line(line: str) -> str:
    """在 author 字段行内，将分号替换为带空格的 'and'。"""
    m = re.match(r"^(\s*author\s*=\s*\{)(.*)(\},?\s*)$", line)
    if not m:
        return line
    prefix, authors, suffix = m.groups()
    return f"{prefix}{authors.replace(';', ' and ')}{suffix}"


def transform_number_line(line: str) -> str:
    """从 number 字段行中移除 '第' 和 '期'。"""
    m = re.match(r"^(\s*number\s*=\s*\{)(.*)(\},?\s*)$", line)
    if not m:
        return line
    prefix, number, suffix = m.groups()
    return f"{prefix}{number.replace('第', '').replace('期', '')}{suffix}"


def transform_line(line: str) -> str:
    """对单行应用所有转换。"""
    line = transform_author_line(line)
    line = transform_number_line(line)
    return line


def main() -> int:
    if not INPUT_PATH.is_file():
        print(f"错误：找不到输入文件：{INPUT_PATH}", file=sys.stderr)
        return 1

    with INPUT_PATH.open("r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = [transform_line(line) for line in lines]

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print(f"已写入修改后的 BibTeX：{OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
