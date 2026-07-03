/**
 * 变更计算：纯数据形状 + 纯函数，不依赖 Zotero 运行时。
 */

import { RULES } from "./rules";

export type CleanableItem = {
  key: string;
  libraryID: number;
  title: string;
  author?: string;
  number?: string;
};

export type Change = {
  itemKey: string;
  itemLibraryID: number;
  itemTitle: string;
  field: string;
  oldValue: string;
  newValue: string;
};

/** writer 消费的纯数据载荷，不含展示字段。 */
export type FieldChange = {
  itemKey: string;
  libraryID: number;
  field: string;
  oldValue: string;
  newValue: string;
};

/**
 * 将展示变更剥离展示字段，生成 writer 可消费的字段变更列表。
 */
export function changesToFieldChanges(changes: Change[]): FieldChange[] {
  return changes.map(
    ({ itemKey, itemLibraryID, field, oldValue, newValue }) => ({
      itemKey,
      libraryID: itemLibraryID,
      field,
      oldValue,
      newValue,
    }),
  );
}

/**
 * 计算一组条目的清理变更。
 * @returns 只包含实际会发生变更的字段。
 */
export function computeChanges(items: CleanableItem[]): Change[] {
  const changes: Change[] = [];
  for (const item of items) {
    for (const rule of RULES) {
      const value = item[rule.field as keyof CleanableItem];
      if (typeof value !== "string") {
        continue;
      }
      const newValue = rule.apply(value);
      if (newValue !== undefined && newValue !== value) {
        changes.push({
          itemKey: item.key,
          itemLibraryID: item.libraryID,
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
