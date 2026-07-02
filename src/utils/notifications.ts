/**
 * 通知工具：通过 Zotero ProgressWindow 展示用户通知。
 */

import type { Change } from "../modules/changes";
import { getString } from "./locale";
import { attachUndoLink } from "./undoLink";

export function showSuccess(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "success",
    })
    .show();
}

export function showInfo(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "default",
    })
    .show();
}

export function showErrorDetails(
  failed: { change: Change; error: Error }[],
): void {
  const progressWindow = new ztoolkit.ProgressWindow(
    addon.data.config.addonName,
  );
  progressWindow.createLine({
    text: getString("message-error-clean-failed", {
      args: { count: String(failed.length) },
    }),
    type: "error",
  });
  for (const { change, error } of failed) {
    progressWindow.createLine({
      text: `${change.itemTitle}: ${error.message}`,
      type: "default",
    });
  }
  progressWindow.show();
}

export function showUndoableSuccess(text: string, onUndo: () => void): void {
  const linkId = "bibtex-clean-undo-link";
  const progressWindow = new ztoolkit.ProgressWindow(
    addon.data.config.addonName,
    {
      closeOnClick: false,
      closeTime: 8000,
    },
  );
  progressWindow
    .createLine({
      text,
      type: "success",
    })
    .addDescription(
      `<a id="${linkId}" href="#">${getString("message-undo")}</a>`,
    )
    .show();

  attachUndoLink(progressWindow, linkId, onUndo);
}
