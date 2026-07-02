import {
  applyChanges,
  computeChanges,
  toCleanableItem,
  undoChanges,
  type Change,
} from "./modules/itemCleaning";
import { openCleaningConfirmationDialog } from "./modules/cleaningDialog";
import { cleanSessionStore } from "./modules/cleanSessionStore";
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

  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    id: "zotero-itemmenu-bibtexclean-undo",
    label: getString("menuitem-undo-last-clean"),
    isDisabled: () => !cleanSessionStore.hasUndo(),
    commandListener: () => {
      undoLastCleanOperation();
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

  const confirmed = await openCleaningConfirmationDialog(
    changes,
    cleanableItems.length,
  );
  if (!confirmed) {
    return;
  }

  const { succeeded, failed } = await applyChanges(changes);
  if (failed.length > 0) {
    showErrorDetails(failed);
  }

  if (succeeded.length > 0) {
    cleanSessionStore.record(succeeded);
    if (failed.length > 0) {
      showInfo(getString("message-success-partial"));
    } else {
      showUndoableSuccess(
        getString("message-success-cleaned"),
        undoLastCleanOperation,
      );
    }
  }
}

async function undoLastCleanOperation(): Promise<void> {
  const operation = cleanSessionStore.consume();
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

function showSuccess(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "success",
    })
    .show();
}

function showErrorDetails(failed: { change: Change; error: Error }[]): void {
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

function showInfo(text: string): void {
  new ztoolkit.ProgressWindow(addon.data.config.addonName)
    .createLine({
      text,
      type: "default",
    })
    .show();
}

function showUndoableSuccess(text: string, onUndo: () => void): void {
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

  setTimeout(() => {
    try {
      const win = (progressWindow as any).win?._window as Window | undefined;
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
