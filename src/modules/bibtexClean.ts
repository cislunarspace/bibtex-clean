/**
 * 清理 BibTeX 文本。
 *
 * 规则：
 * 1. author 字段中的分号替换为带空格的 and。
 * 2. number 字段中移除汉字“第”和“期”。
 *
 * 其余行保持不变。
 */

export function cleanBibTeX(bibtexText: string): string {
  return bibtexText
    .split("\n")
    .map((line) => cleanNumberField(cleanAuthorField(line)))
    .join("\n");
}

export function cleanAuthorField(line: string): string {
  const match = line.match(/^(\s*author\s*=\s*\{)(.*)(\},?\s*)$/);
  if (!match) {
    return line;
  }
  const [, prefix, authors, suffix] = match;
  return `${prefix}${authors.replace(/;/g, " and ")}${suffix}`;
}

export function cleanNumberField(line: string): string {
  const match = line.match(/^(\s*number\s*=\s*\{)(.*)(\},?\s*)$/);
  if (!match) {
    return line;
  }
  const [, prefix, number, suffix] = match;
  return `${prefix}${number.replace(/[第期]/g, "")}${suffix}`;
}
