/**
 * Undo link DOM 注入：在 ProgressWindow 中挂载可点击的撤销链接。
 *
 * 内部使用 toolkit 未公开的 win._window 访问 ProgressWindow 的 DOM，
 * 通过 try-catch 容错。
 */

/**
 * 在 ProgressWindow 中挂载撤销链接的点击事件。
 * @param progressWindow toolkit 的 ProgressWindow 实例
 * @param linkId addDescription 中使用的链接 id
 * @param onUndo 点击时触发的回调
 */
export function attachUndoLink(
  progressWindow: any,
  linkId: string,
  onUndo: () => void,
): void {
  setTimeout(() => {
    try {
      const win = progressWindow.win?._window as Window | undefined;
      if (!win) {
        return;
      }
      const link = win.document.getElementById(linkId);
      if (!link) {
        return;
      }
      link.addEventListener("click", (event: Event) => {
        event.preventDefault();
        onUndo();
        progressWindow.close();
      });
    } catch {
      // Ignore errors from accessing the internal progress window DOM.
    }
  }, 100);
}
