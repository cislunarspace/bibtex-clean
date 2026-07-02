/**
 * 条目清理核心逻辑。
 *
 * 该模块保持纯函数，不依赖 Zotero 运行时，便于测试。
 */

export type CleanableItem = {
  key: string;
  title: string;
  author?: string;
  number?: string;
};

export type Change = {
  itemKey: string;
  itemTitle: string;
  field: string;
  oldValue: string;
  newValue: string;
};

export type LastCleanOperation = {
  changes: Change[];
};

export type CleaningRule = {
  field: keyof CleanableItem;
  apply: (value: string) => string | undefined;
};

/**
 * 清理规则数组。当前仅包含 author 字段规则（Slice 1）。
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
 * 计算一组条目的清理变更。
 * @returns 只包含实际会发生变更的字段。
 */
export function computeChanges(items: CleanableItem[]): Change[] {
  const changes: Change[] = [];
  for (const item of items) {
    for (const rule of RULES) {
      const value = item[rule.field];
      if (typeof value !== "string") {
        continue;
      }
      const newValue = rule.apply(value);
      if (newValue !== undefined && newValue !== value) {
        changes.push({
          itemKey: item.key,
          itemTitle: item.title,
          field: rule.field,
          oldValue: value,
          newValue,
        });
      }
    }
  }
  return changes;
}

/**
 * 从 Zotero Item 提取可清理字段。
 * 只处理普通文献条目（regular item），忽略笔记、附件等。
 *
 * 注意：Zotero 中作者信息存储在 creators 而非单一字段中，
 * 这里将 creatorType 为 author 的创作者合并为便于清理的字符串。
 */
export function toCleanableItem(item: Zotero.Item): CleanableItem | undefined {
  if (!item.isRegularItem()) {
    return undefined;
  }
  return {
    key: item.key,
    title: item.getField("title") as string,
    author: formatAuthors(item.getCreatorsJSON()),
    number: (item.getField("number") as string) || undefined,
  };
}

/**
 * 将变更写回 Zotero 条目。
 */
export async function applyChanges(changes: Change[]): Promise<{
  succeeded: Change[];
  failed: { change: Change; error: Error }[];
}> {
  const succeeded: Change[] = [];
  const failed: { change: Change; error: Error }[] = [];
  for (const change of changes) {
    try {
      const item = await Zotero.Items.getAsync(change.itemKey);
      if (!item) {
        throw new Error(`Item ${change.itemKey} not found`);
      }
      if (change.field === "author") {
        applyAuthorChange(item, change.newValue);
      } else {
        item.setField(change.field as any, change.newValue);
      }
      await item.saveTx();
      succeeded.push(change);
    } catch (error) {
      failed.push({ change, error: error as Error });
    }
  }
  return { succeeded, failed };
}

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

export function applyAuthorChange(item: Zotero.Item, newValue: string): void {
  const newAuthors = parseAuthors(newValue);
  const creators = item.getCreatorsJSON();
  const originalAuthorCount = creators.filter(
    (creator) => creator.creatorType === "author",
  ).length;
  if (newAuthors.length !== originalAuthorCount) {
    throw new Error(
      `Author count mismatch: expected ${originalAuthorCount}, got ${newAuthors.length}`,
    );
  }
  const result: _ZoteroTypes.Item.CreatorJSON[] = [];
  let authorIndex = 0;
  for (const creator of creators) {
    if (creator.creatorType === "author") {
      result.push(newAuthors[authorIndex]);
      authorIndex++;
    } else {
      result.push(creator);
    }
  }
  item.setCreators(result);
}

/**
 * 将 author 字符串解析为 Zotero creator 数组。
 *
 * 已知限制：
 * - 按小写 " and " 拆分，与清理规则输出一致；
 * - 含逗号的机构名（如 "ACME, Inc."）会被拆成 lastName/firstName，
 *   当前仅处理个人作者常见的 "Last, First" 格式。
 */
export function parseAuthors(value: string): _ZoteroTypes.Item.CreatorJSON[] {
  return value.split(" and ").map((part) => {
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
