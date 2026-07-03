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
