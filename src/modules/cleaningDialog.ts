import type { Change } from "./itemCleaning";
import { getString } from "../utils/locale";

/**
 * 打开条目清理确认对话框。
 * @param changes 要展示的变更列表
 * @returns 用户是否点击「确认清理」
 */
export async function openCleaningConfirmationDialog(
  changes: Change[],
): Promise<boolean> {
  const dialog = new ztoolkit.Dialog(1, 1);

  dialog.addCell(
    0,
    0,
    {
      tag: "div",
      namespace: "html",
      id: "bibtex-clean-dialog-content",
      styles: {
        width: "600px",
        maxHeight: "400px",
        overflowY: "auto",
        padding: "12px 16px",
      },
      properties: {
        innerHTML: renderDialogHtml(changes),
      },
    },
    true,
  );

  dialog
    .addButton(getString("dialog-button-cancel"), "cancel")
    .addButton(getString("dialog-button-confirm-clean"), "confirm-clean");

  const dialogData: { _lastButtonId?: string } = {};
  dialog.setDialogData(dialogData);

  dialog.open(getString("dialog-title-clean-items"), {
    centerscreen: true,
    resizable: true,
    fitContent: true,
  });

  await new Promise<void>((resolve) => {
    const check = () => {
      if (dialog.window?.closed) {
        resolve();
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });

  return dialogData._lastButtonId === "confirm-clean";
}

function renderDialogHtml(changes: Change[]): string {
  const rows = changes
    .map(
      (change) => `
    <tr>
      <td class="item-title">${escapeHtml(change.itemTitle)}</td>
      <td class="field-name">${escapeHtml(change.field)}</td>
      <td>
        <span class="old-value">${escapeHtml(change.oldValue)}</span>
        <span class="arrow">→</span>
        <span class="new-value">${escapeHtml(change.newValue)}</span>
      </td>
    </tr>
  `,
    )
    .join("");

  return `
    <style>
      .bibtex-clean-summary {
        padding: 8px 0 12px;
        color: #666;
        font-size: 13px;
        border-bottom: 1px solid #eee;
        margin-bottom: 12px;
      }
      .bibtex-clean-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .bibtex-clean-table th,
      .bibtex-clean-table td {
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid #eee;
        vertical-align: top;
      }
      .bibtex-clean-table th {
        color: #666;
        font-weight: 600;
        background: #fafafa;
      }
      .bibtex-clean-table .item-title {
        font-weight: 600;
      }
      .bibtex-clean-table .field-name {
        color: #666;
        font-family: monospace;
        font-size: 12px;
      }
      .bibtex-clean-table .old-value {
        color: #d93025;
        text-decoration: line-through;
      }
      .bibtex-clean-table .new-value {
        color: #188038;
      }
      .bibtex-clean-table .arrow {
        color: #666;
        padding: 0 4px;
      }
    </style>
    <div class="bibtex-clean-summary">
      ${getString("dialog-summary-clean-items", {
        args: {
          total: String(new Set(changes.map((c) => c.itemKey)).size),
          changes: String(changes.length),
        },
      })}
    </div>
    <table class="bibtex-clean-table">
      <thead>
        <tr>
          <th>${getString("dialog-column-item")}</th>
          <th>${getString("dialog-column-field")}</th>
          <th>${getString("dialog-column-change")}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
