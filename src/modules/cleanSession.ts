/**
 * 清理会话编排：协调选择 → 计算 → 确认 → 写入 → 通知的完整流程。
 *
 * 通过显式依赖注入 store / notifier，便于测试。
 */

import { computeChanges } from "./changes";
import type { CleanSessionStore } from "./cleanSessionStore";
import { openCleaningConfirmationDialog } from "./cleaningDialog";
import { applyChanges, toCleanableItem, undoChanges } from "./zoteroWriter";
import {
  showErrorDetails,
  showInfo,
  showSuccess,
  showUndoableSuccess,
} from "../utils/notifications";
import { getString } from "../utils/locale";

/**
 * 清理当前选中的 Zotero 条目。
 */
export async function cleanSelectedItems(
  store: CleanSessionStore,
): Promise<void> {
  const items = ZoteroPane.getSelectedItems();
  const cleanableItems = items
    .map((item) => toCleanableItem(item))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  if (cleanableItems.length === 0) {
    showInfo(getString("message-no-changes"));
    return;
  }

  const changes = computeChanges(cleanableItems);
  if (changes.length === 0) {
    showInfo(getString("message-no-changes"));
    return;
  }

  const confirmed = await openCleaningConfirmationDialog(
    changes,
    cleanableItems.length,
  );
  if (confirmed !== "confirm") {
    return;
  }

  const { succeeded, failed } = await applyChanges(changes);
  if (failed.length > 0) {
    showErrorDetails(failed);
  }

  if (succeeded.length > 0) {
    store.record(succeeded);
    if (failed.length > 0) {
      showInfo(getString("message-success-partial"));
    } else {
      showUndoableSuccess(getString("message-success-cleaned"), () => {
        undoLastCleanOperation(store);
      });
    }
  }
}

/**
 * 撤销最近一次清理操作。
 */
export async function undoLastCleanOperation(
  store: CleanSessionStore,
): Promise<void> {
  const operation = store.consume();
  if (!operation) {
    return;
  }

  const { succeeded, failed } = await undoChanges(operation.changes);
  if (failed.length > 0) {
    showErrorDetails(failed);
  }

  if (succeeded.length > 0) {
    showSuccess(getString("message-success-undone"));
  }
}
