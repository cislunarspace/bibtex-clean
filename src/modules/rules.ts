/**
 * 清理规则：真纯函数，不依赖 Zotero 运行时。
 */

export type CleaningRule = {
  field: string;
  apply: (value: string) => string | undefined;
};

/**
 * 清理规则数组。
 */
export const RULES: CleaningRule[] = [
  {
    field: "author",
    apply: (value) => {
      if (!value.includes(";")) {
        return undefined;
      }
      return value.replace(/\s*;\s*/g, " and ");
    },
  },
  {
    field: "number",
    apply: (value) => {
      const cleaned = value.replace(/[第期]/g, "").trim();
      if (cleaned === value) {
        return undefined;
      }
      return cleaned;
    },
  },
];

/**
 * 对指定字段应用清理规则。
 * @returns 变更后的新值；无需变更时返回 undefined。
 */
export function applyRule(field: string, value: string): string | undefined {
  const rule = RULES.find((r) => r.field === field);
  return rule?.apply(value);
}

/**
 * 将 Zotero creator 数组合并为可清理的 author 字符串。
 */
export function formatAuthors(
  creators: _ZoteroTypes.Item.CreatorJSON[],
): string | undefined {
  const authors = creators
    .filter((creator) => creator.creatorType === "author")
    .map(
      (creator) => creator.name || `${creator.lastName}, ${creator.firstName}`,
    );
  return authors.length > 0 ? authors.join("; ") : undefined;
}

/**
 * 将 author 字符串解析为 Zotero creator 数组。
 *
 * 输入可能是清理前的 "Smith, John; Doe, Jane" 或清理后的
 * "Smith, John and Doe, Jane"，因此按 ";" 或 " and " 拆分。
 *
 * 已知限制：
 * - 含逗号的机构名（如 "ACME, Inc."）会被拆成 lastName/firstName，
 *   当前仅处理个人作者常见的 "Last, First" 格式。
 */
export function parseAuthors(value: string): _ZoteroTypes.Item.CreatorJSON[] {
  const separator = value.includes(";") ? ";" : " and ";
  return value.split(separator).map((part) => {
    const trimmed = part.trim();
    const commaIndex = trimmed.indexOf(",");
    if (commaIndex > 0) {
      return {
        creatorType: "author",
        lastName: trimmed.slice(0, commaIndex).trim(),
        firstName: trimmed.slice(commaIndex + 1).trim(),
      };
    }
    return {
      creatorType: "author",
      name: trimmed,
    };
  });
}
