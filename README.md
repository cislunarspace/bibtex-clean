# bibtex-clean

A small Python utility to clean up BibTeX files.

## Features

- Replace `;` with ` and ` inside `author` fields.
- Remove the Chinese characters `第` and `期` from `number` fields.
- Leaves all other fields unchanged.

## Usage

```bash
python3 bibtex_clean.py
```

By default the script reads `/home/ouyangjiahong/Downloads/1.bib` and writes the cleaned result to `/home/ouyangjiahong/Downloads/1_modified.bib`. Edit the `INPUT_PATH` and `OUTPUT_PATH` variables in the script to point to your own files.

## Requirements

- Python 3.6+
