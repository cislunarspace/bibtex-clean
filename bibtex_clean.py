#!/usr/bin/env python3
"""Clean specific fields of a BibTeX file.

1. Replace ';' with ' and ' inside author fields.
2. Remove the characters '第' and '期' from number fields.

All other lines are left unchanged.
"""

import re
import sys
from pathlib import Path

INPUT_PATH = Path("/home/ouyangjiahong/Downloads/1.bib")
OUTPUT_PATH = Path("/home/ouyangjiahong/Downloads/1_modified.bib")


def transform_author_line(line: str) -> str:
    """Replace semicolons with spaced 'and' inside an author field line."""
    m = re.match(r"^(\s*author\s*=\s*\{)(.*)(\},?\s*)$", line)
    if not m:
        return line
    prefix, authors, suffix = m.groups()
    return f"{prefix}{authors.replace(';', ' and ')}{suffix}"


def transform_number_line(line: str) -> str:
    """Remove '第' and '期' from a number field line."""
    m = re.match(r"^(\s*number\s*=\s*\{)(.*)(\},?\s*)$", line)
    if not m:
        return line
    prefix, number, suffix = m.groups()
    return f"{prefix}{number.replace('第', '').replace('期', '')}{suffix}"


def transform_line(line: str) -> str:
    """Apply all transformations to a single line."""
    line = transform_author_line(line)
    line = transform_number_line(line)
    return line


def main() -> int:
    if not INPUT_PATH.is_file():
        print(f"Error: input file not found: {INPUT_PATH}", file=sys.stderr)
        return 1

    with INPUT_PATH.open("r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines = [transform_line(line) for line in lines]

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        f.writelines(new_lines)

    print(f"Wrote modified BibTeX to: {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
