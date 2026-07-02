import { cleanBibTeX } from "./bibtexClean";
import { getString } from "../utils/locale";

const BIBTEX_TRANSLATOR_ID = "9cb70025-a888-4a29-a210-93ec52da40d4";

/**
 * 获取当前选中的 Zotero 条目。
 */
function getSelectedItems(): Zotero.Item[] {
  return ZoteroPane.getSelectedItems();
}

/**
 * 将条目导出为 BibTeX 字符串。
 */
async function exportItemsToBibTeX(items: Zotero.Item[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const translation = new (Zotero as any).Translate.Export();
    translation.setItems(items.slice());
    translation.setTranslator(BIBTEX_TRANSLATOR_ID);
    translation.setHandler(
      "done",
      (obj: { string: string }, worked: boolean) => {
        if (!worked) {
          reject(
            new Error(
              getString("message-error-export-failed", {
                args: { message: "translation failed" },
              }),
            ),
          );
          return;
        }
        resolve(obj.string.replace(/\r\n/g, "\n"));
      },
    );
    translation.translate();
  });
}

/**
 * 将文本复制到系统剪贴板。
 */
function copyToClipboard(text: string): void {
  new ztoolkit.Clipboard().addText(text, "text/plain").copy();
}

/**
 * 显示成功提示。
 */
function showSuccess(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "success",
    })
    .show();
}

/**
 * 显示错误提示。
 */
function showError(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "error",
    })
    .show();
}

/**
 * 主入口：导出选中条目为 BibTeX，清理后复制到剪贴板。
 */
export async function copyCleanBibTeXToClipboard(): Promise<void> {
  const items = getSelectedItems();
  if (items.length === 0) {
    showError(getString("message-error-no-selection"));
    return;
  }

  try {
    const bibtex = await exportItemsToBibTeX(items);
    const cleaned = cleanBibTeX(bibtex);
    copyToClipboard(cleaned);
    showSuccess(getString("message-success-copied"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showError(getString("message-error-export-failed", { args: { message } }));
  }
}
