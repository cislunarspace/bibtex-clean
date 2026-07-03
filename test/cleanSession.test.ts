import { assert } from "chai";
import {
  cleanSelectedItems,
  undoLastCleanOperation,
} from "../src/modules/cleanSession";
import { CleanSessionStore } from "../src/modules/cleanSessionStore";

/**
 * Click-chain seam for "右键菜单清理条目失效".
 *
 * `cleanSelectedItems` is the function that the right-click "clean" menu
 * item calls. It runs:
 *   1) Zotero.getActiveZoteroPane().getSelectedItems() -> toCleanableItem
 *   2) computeChanges (pure, already tested)
 *   3) openCleaningConfirmationDialog (ztoolkit.Dialog)
 *   4) applyChanges (Zotero.Items.getAsync + saveTx)
 *   5) store.record + notification
 *
 * If any step in this chain breaks (e.g. the refactor in PR #22 dropped a
 * dependency), this suite catches it without needing a live Zotero UI.
 */

type MockItem = {
  key: string;
  title: string;
  fields: Record<string, string>;
  creators: _ZoteroTypes.Item.CreatorJSON[];
  saveCount: number;
  isRegularItem: () => boolean;
  getField: (f: string) => string;
  setField: (f: string, v: string) => void;
  getCreatorsJSON: () => _ZoteroTypes.Item.CreatorJSON[];
  setCreators: (c: _ZoteroTypes.Item.CreatorJSON[]) => void;
  saveTx: () => Promise<void>;
};

function createMockItem({
  key,
  title = "",
  fields = {},
  creators = [],
  saveShouldThrow = false,
}: {
  key: string;
  title?: string;
  fields?: Record<string, string>;
  creators?: _ZoteroTypes.Item.CreatorJSON[];
  saveShouldThrow?: boolean;
}): MockItem {
  const item: MockItem = {
    key,
    title,
    fields: { ...fields },
    creators: [...creators],
    saveCount: 0,
    isRegularItem: () => true,
    getField: (f: string) => item.fields[f],
    setField: (f: string, v: string) => {
      item.fields[f] = v;
    },
    getCreatorsJSON: () => item.creators,
    setCreators: (c: _ZoteroTypes.Item.CreatorJSON[]) => {
      item.creators.length = 0;
      item.creators.push(...c);
    },
    saveTx: async () => {
      item.saveCount += 1;
      if (saveShouldThrow) {
        throw new Error("save failed");
      }
    },
  };
  return item;
}

class MockDialog {
  public dialogData: { [k: string]: any } = {};
  public window: { closed: boolean } = { closed: false };
  public opened = false;
  public buttonId: string | null = null;
  private buttons: Array<{ id?: string }> = [];

  constructor(_rows: number, _cols: number) {}

  addCell() {
    return this;
  }

  addButton(label: string, id?: string) {
    this.buttons.push({ id });
    this.buttonId = id ?? null;
    return this;
  }

  setDialogData(d: { [k: string]: any }) {
    this.dialogData = d;
    return this;
  }

  open() {
    this.opened = true;
    // Synchronously simulate the user clicking the chosen button.
    const target = this.buttonId ?? "cancel";
    this.dialogData._lastButtonId = target;
    this.window.closed = true;
    return this;
  }
}

class MockProgressWindow {
  constructor(_addonName: string, _opts?: any) {}
  createLine() {
    return {
      addDescription: () => this,
      show: () => this,
    };
  }
  show() {
    return this;
  }
}

describe("cleanSession (click chain from right-click menu)", function () {
  let originalZtoolkit: PropertyDescriptor | undefined;
  let originalAddon: PropertyDescriptor | undefined;
  let originalGetActiveZoteroPane: typeof Zotero.getActiveZoteroPane;
  let originalGetAsync: typeof Zotero.Items.getAsync;

  let nextButtonId: "confirm-clean" | "cancel" = "confirm-clean";
  let createdDialogs: MockDialog[];
  let createdProgressWindows: MockProgressWindow[];
  let getSelectedItemsCalls: number;

  beforeEach(function () {
    createdDialogs = [];
    createdProgressWindows = [];
    getSelectedItemsCalls = 0;

    originalZtoolkit = Object.getOwnPropertyDescriptor(globalThis, "ztoolkit");
    originalAddon = Object.getOwnPropertyDescriptor(globalThis, "addon");

    Object.defineProperty(globalThis, "ztoolkit", {
      value: {
        Dialog: function (rows: number, cols: number) {
          const d = new MockDialog(rows, cols);
          // override buttonId so the next open() picks the test's choice
          const origAddButton = d.addButton.bind(d);
          d.addButton = (label: string, id?: string) => {
            origAddButton(label, id);
            d.buttonId = nextButtonId;
            return d;
          };
          createdDialogs.push(d);
          return d;
        },
        ProgressWindow: function (name: string, opts?: any) {
          const pw = new MockProgressWindow(name, opts);
          createdProgressWindows.push(pw);
          return pw;
        },
        Menu: { register: () => {} },
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, "addon", {
      value: {
        data: {
          locale: {
            current: {
              formatMessagesSync: (queries: any[]) =>
                queries.map((q) => ({
                  value: `MOCK[${q.id}]`,
                  attributes: null,
                })),
            },
          },
          config: { addonName: "BibTeX Clean" },
        },
      },
      writable: true,
      configurable: true,
    });

    // ZoteroPane is not a global in newer Zotero (7+ / 9); use the official
    // Zotero.getActiveZoteroPane() API instead.
    originalGetActiveZoteroPane = Zotero.getActiveZoteroPane;
    Zotero.getActiveZoteroPane = () =>
      ({
        getSelectedItems: () => {
          getSelectedItemsCalls += 1;
          return (globalThis as any).__mockSelectedItems ?? [];
        },
      }) as unknown as _ZoteroTypes.ZoteroPane;

    originalGetAsync = Zotero.Items.getAsync;
  });

  afterEach(function () {
    if (originalZtoolkit) {
      Object.defineProperty(globalThis, "ztoolkit", originalZtoolkit);
    } else {
      delete (globalThis as any).ztoolkit;
    }
    if (originalAddon) {
      Object.defineProperty(globalThis, "addon", originalAddon);
    } else {
      delete (globalThis as any).addon;
    }
    Zotero.getActiveZoteroPane = originalGetActiveZoteroPane;
    Zotero.Items.getAsync = originalGetAsync;
    delete (globalThis as any).__mockSelectedItems;
  });

  it("clean click: selected item is loaded, dialog shown, field written, store records", async function () {
    const item = createMockItem({
      key: "A1",
      fields: { title: "Paper One", author: "Smith, John; Doe, Jane" },
      creators: [
        { creatorType: "author", firstName: "John", lastName: "Smith" },
        { creatorType: "author", firstName: "Jane", lastName: "Doe" },
      ],
    });

    (globalThis as any).__mockSelectedItems = [
      {
        key: item.key,
        isRegularItem: item.isRegularItem,
        getField: (f: string) => (f === "title" ? item.title : item.fields[f]),
        getCreatorsJSON: item.getCreatorsJSON,
      },
    ];

    Zotero.Items.getAsync = (async (key: string) => {
      if (key === item.key) {
        // Return a writer-compatible mock
        return {
          key: item.key,
          isRegularItem: item.isRegularItem,
          getField: item.getField,
          setField: item.setField,
          getCreatorsJSON: item.getCreatorsJSON,
          setCreators: item.setCreators,
          saveTx: item.saveTx,
        } as unknown as Zotero.Item;
      }
      throw new Error(`unexpected key ${key}`);
    }) as typeof Zotero.Items.getAsync;

    nextButtonId = "confirm-clean";
    const store = new CleanSessionStore();

    await cleanSelectedItems(store);

    assert.equal(
      getSelectedItemsCalls,
      1,
      "Zotero.getActiveZoteroPane().getSelectedItems should be called once",
    );
    assert.lengthOf(
      createdDialogs,
      1,
      "confirmation dialog should be opened exactly once",
    );
    assert.isTrue(createdDialogs[0].opened, "dialog.open() should be called");
    assert.equal(
      createdDialogs[0].dialogData._lastButtonId,
      "confirm-clean",
      "user should have clicked the confirm-clean button",
    );
    // Author changes are stored as creators, not as the string field.
    assert.deepEqual(
      item.getCreatorsJSON(),
      [
        { creatorType: "author", lastName: "Smith", firstName: "John" },
        { creatorType: "author", lastName: "Doe", firstName: "Jane" },
      ],
      "authors should be rewritten as creators",
    );
    assert.equal(
      item.saveCount,
      1,
      "saveTx should be called once after rewriting",
    );
    assert.isTrue(
      store.hasUndo(),
      "store should record the successful change for undo",
    );
  });

  it("clean click + cancel: dialog opens, no field is written, store stays empty", async function () {
    const item = createMockItem({
      key: "A2",
      fields: { author: "Smith, John; Doe, Jane" },
      creators: [
        { creatorType: "author", firstName: "John", lastName: "Smith" },
        { creatorType: "author", firstName: "Jane", lastName: "Doe" },
      ],
    });

    (globalThis as any).__mockSelectedItems = [
      {
        key: item.key,
        isRegularItem: item.isRegularItem,
        getField: (f: string) => (f === "title" ? item.title : item.fields[f]),
        getCreatorsJSON: item.getCreatorsJSON,
      },
    ];

    Zotero.Items.getAsync = (async (key: string) => {
      if (key === item.key) {
        return {
          key: item.key,
          isRegularItem: item.isRegularItem,
          getField: item.getField,
          setField: item.setField,
          getCreatorsJSON: item.getCreatorsJSON,
          setCreators: item.setCreators,
          saveTx: item.saveTx,
        } as unknown as Zotero.Item;
      }
      throw new Error(`unexpected key ${key}`);
    }) as typeof Zotero.Items.getAsync;

    nextButtonId = "cancel";
    const store = new CleanSessionStore();

    await cleanSelectedItems(store);

    assert.lengthOf(
      createdDialogs,
      1,
      "dialog should still open even on cancel path",
    );
    assert.equal(
      createdDialogs[0].dialogData._lastButtonId,
      "cancel",
      "user should have clicked the cancel button",
    );
    assert.equal(item.saveCount, 0, "saveTx must NOT be called on cancel");
    assert.isFalse(store.hasUndo(), "store must stay empty on cancel");
  });

  it("clean click with no selection: dialog never opens, no error", async function () {
    (globalThis as any).__mockSelectedItems = [];
    const store = new CleanSessionStore();

    await cleanSelectedItems(store);

    assert.lengthOf(createdDialogs, 0, "no dialog when nothing is selected");
    assert.isFalse(store.hasUndo());
  });

  it("undo click after a recorded clean: dialog never opens; old value is restored", async function () {
    const item = createMockItem({
      key: "A3",
      fields: { author: "Smith, John and Doe, Jane" },
      creators: [
        { creatorType: "author", firstName: "John", lastName: "Smith" },
        { creatorType: "author", firstName: "Jane", lastName: "Doe" },
      ],
    });

    Zotero.Items.getAsync = (async (key: string) => {
      if (key === item.key) {
        return {
          key: item.key,
          isRegularItem: item.isRegularItem,
          getField: item.getField,
          setField: item.setField,
          getCreatorsJSON: item.getCreatorsJSON,
          setCreators: item.setCreators,
          saveTx: item.saveTx,
        } as unknown as Zotero.Item;
      }
      throw new Error(`unexpected key ${key}`);
    }) as typeof Zotero.Items.getAsync;

    const store = new CleanSessionStore();
    store.record([
      {
        itemKey: item.key,
        itemTitle: "Paper Three",
        field: "author",
        oldValue: "Smith, John; Doe, Jane",
        newValue: "Smith, John and Doe, Jane",
      } as any,
    ]);

    await undoLastCleanOperation(store);

    assert.lengthOf(
      createdDialogs,
      0,
      "undo path must NOT open the confirmation dialog",
    );
    assert.deepEqual(
      item.getCreatorsJSON(),
      [
        { creatorType: "author", lastName: "Smith", firstName: "John" },
        { creatorType: "author", lastName: "Doe", firstName: "Jane" },
      ],
      "undo must restore the old creators",
    );
    assert.equal(item.saveCount, 1, "saveTx should be called once during undo");
    assert.isFalse(store.hasUndo(), "store must be empty after undo (consume)");
  });
});
