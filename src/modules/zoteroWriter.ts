/**
 * Zotero 条目读写：耦合 Zotero 运行时，可通过 mock 测试。
 */

import type { CleanableItem, FieldChange } from "./changes";

/**
 * 从 Zotero Item 提取可清理字段。
 * 只处理普通文献条目（regular item），忽略笔记、附件等。
 *
 * 注意：Zotero 中作者信息存储在 creators 而非单一字段中，
 * 这里将 creatorType 为 author 或 inventor 的创作者合并为便于清理的字符串。
 */
export function toCleanableItem(item: Zotero.Item): CleanableItem | undefined {
  if (!item.isRegularItem()) {
    return undefined;
  }
  return {
    key: item.key,
    libraryID: item.libraryID,
    title: item.getField("title") as string,
    author: formatAuthors(item.getCreatorsJSON()),
    number: (item.getField("number") as string) || undefined,
  };
}

/**
 * 将变更写回 Zotero 条目。
 */
export async function applyChanges(changes: FieldChange[]): Promise<{
  succeeded: FieldChange[];
  failed: { change: FieldChange; error: Error }[];
}> {
  return applyChangeValues(changes, (change) => change.newValue);
}

/**
 * 撤销一组变更，将字段恢复到清理前的值。
 */
export async function undoChanges(changes: FieldChange[]): Promise<{
  succeeded: FieldChange[];
  failed: { change: FieldChange; error: Error }[];
}> {
  return applyChangeValues(changes, (change) => change.oldValue);
}

async function applyChangeValues(
  changes: FieldChange[],
  valueSelector: (change: FieldChange) => string,
): Promise<{
  succeeded: FieldChange[];
  failed: { change: FieldChange; error: Error }[];
}> {
  const succeeded: FieldChange[] = [];
  const failed: { change: FieldChange; error: Error }[] = [];
  for (const change of changes) {
    try {
      const item = await Zotero.Items.getByLibraryAndKeyAsync(
        change.libraryID,
        change.itemKey,
      );
      if (!item) {
        throw new Error(`Item ${change.itemKey} not found`);
      }
      const value = valueSelector(change);
      if (change.field === "author") {
        applyAuthorChange(item, value);
      } else {
        item.setField(change.field as any, value);
      }
      await item.saveTx();
      succeeded.push(change);
    } catch (error) {
      failed.push({ change, error: error as Error });
    }
  }
  return { succeeded, failed };
}

export function applyAuthorChange(item: Zotero.Item, newValue: string): void {
  const newAuthors = parseAuthors(newValue);
  const creators = item.getCreatorsJSON();
  const nonAuthors = creators.filter(
    (creator) =>
      creator.creatorType !== "author" && creator.creatorType !== "inventor",
  );
  item.setCreators([...newAuthors, ...nonAuthors]);
}

/**
 * 将 Zotero creator 数组合并为可清理的 author 字符串。
 */
export function formatAuthors(
  creators: _ZoteroTypes.Item.CreatorJSON[],
): string | undefined {
  const authors = creators
    .filter(
      (creator) =>
        creator.creatorType === "author" || creator.creatorType === "inventor",
    )
    .map((creator) => {
      if (creator.name) return creator.name;
      if (creator.firstName) return `${creator.lastName}, ${creator.firstName}`;
      return creator.lastName;
    });
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
  return value
    .split(separator)
    .map((part) => part.trim())
    .filter((trimmed) => trimmed !== "")
    .map((trimmed) => {
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
