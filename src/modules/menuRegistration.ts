/**
 * 菜单注册：负责右键菜单项的注册。
 */

import type { CleanSessionStore } from "./cleanSessionStore";
import { getString } from "../utils/locale";

/**
 * 注册 Zotero 条目右键菜单的"清理"和"撤销"项。
 * @param store 用于判断是否有可撤销操作
 * @param onClean 点击"清理"时的回调
 * @param onUndo 点击"撤销"时的回调
 */
export function registerItemMenu(
  store: CleanSessionStore,
  onClean: () => void,
  onUndo: () => void,
): void {
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "zotero-itemmenu-bibtexclean-clean",
    label: getString("menuitem-clean-items"),
    commandListener: onClean,
  });

  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "zotero-itemmenu-bibtexclean-undo",
    label: getString("menuitem-undo-last-clean"),
    isDisabled: () => !store.hasUndo(),
    commandListener: onUndo,
  });
}
