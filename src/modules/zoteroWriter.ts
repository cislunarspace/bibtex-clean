/**
 * Zotero 条目读写：耦合 Zotero 运行时，可通过 mock 测试。
 */

import type { Change, CleanableItem } from "./changes";
import { formatAuthors, parseAuthors } from "./rules";

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
  return applyChangeValues(changes, (change) => change.newValue);
}

/**
 * 撤销一组变更，将字段恢复到清理前的值。
 */
export async function undoChanges(changes: Change[]): Promise<{
  succeeded: Change[];
  failed: { change: Change; error: Error }[];
}> {
  return applyChangeValues(changes, (change) => change.oldValue);
}

async function applyChangeValues(
  changes: Change[],
  valueSelector: (change: Change) => string,
): Promise<{
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
