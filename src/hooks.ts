import {
  applyChanges,
  computeChanges,
  toCleanableItem,
  type Change,
} from "./modules/itemCleaning";
import { openCleaningConfirmationDialog } from "./modules/cleaningDialog";
import { getString, initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  addon.data.ztoolkit = createZToolkit();

  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "zotero-itemmenu-bibtexclean-clean",
    label: getString("menuitem-clean-items"),
    commandListener: () => {
      cleanSelectedItems();
    },
  });
}

async function onMainWindowUnload(_win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

async function cleanSelectedItems(): Promise<void> {
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

  const confirmed = await openCleaningConfirmationDialog(changes);
  if (!confirmed) {
    return;
  }

  const { succeeded, failed } = await applyChanges(changes);
  if (failed.length > 0) {
    showError(
      getString("message-error-clean-failed", {
        args: { count: String(failed.length) },
      }),
    );
  }

  if (succeeded.length > 0) {
    addon.data.lastCleanOperation = { changes: cloneChanges(succeeded) };
    showSuccess(getString("message-success-cleaned"));
  }
}

function cloneChanges(changes: Change[]): Change[] {
  return changes.map((change) => ({ ...change }));
}

function showSuccess(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "success",
    })
    .show();
}

function showError(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "error",
    })
    .show();
}

function showInfo(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "default",
    })
    .show();
}

async function onNotify(
  _event: string,
  _type: string,
  _ids: Array<string | number>,
  _extraData: { [key: string]: any },
) {}

async function onPrefsEvent(_type: string, _data: { [key: string]: any }) {}

function onShortcuts(_type: string) {}

function onDialogEvents(_type: string) {}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
};
