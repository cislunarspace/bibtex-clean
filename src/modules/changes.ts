/**
 * 变更计算：纯数据形状 + 纯函数，不依赖 Zotero 运行时。
 */

import { RULES } from "./rules";

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
