# bibtex-clean

一个用于清理 BibTeX 文件的小型 Python 工具。

## 功能

- 将 `author` 字段中的 `;` 替换为 ` and `。
- 从 `number` 字段中移除汉字 `第` 和 `期`。
- 其余字段保持不变。

## 用法

```bash
python3 bibtex_clean.py
```

默认情况下，脚本读取 `/home/ouyangjiahong/Downloads/1.bib`，并将清理后的结果写入 `/home/ouyangjiahong/Downloads/1_modified.bib`。编辑脚本中的 `INPUT_PATH` 和 `OUTPUT_PATH` 变量，以指向你自己的文件。

## 环境要求

- Python 3.6+
