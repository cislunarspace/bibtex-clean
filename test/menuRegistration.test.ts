import { assert } from "chai";
import { registerItemMenu } from "../src/modules/menuRegistration";
import type { CleanSessionStore } from "../src/modules/cleanSessionStore";

/**
 * Hook-side seam for "右键菜单清理条目失效".
 *
 * No existing test exercises the right-click menu hook path. This suite
 * mocks the global `ztoolkit` and `addon` so `registerItemMenu` runs in
 * isolation, then asserts the captured `ztoolkit.Menu.register` calls.
 *
 * If the menu registration itself is broken (missing call, wrong id,
 * dropped callback, or thrown exception inside getString / store wiring),
 * at least one of these tests goes red.
 */
describe("menuRegistration (right-click menu hook)", function () {
  type MenuCall = { target: string; options: any };

  let menuCalls: MenuCall[];
  let originalZtoolkitDesc: PropertyDescriptor | undefined;
  let originalAddonDesc: PropertyDescriptor | undefined;

  beforeEach(function () {
    menuCalls = [];
    originalZtoolkitDesc = Object.getOwnPropertyDescriptor(
      globalThis,
      "ztoolkit",
    );
    originalAddonDesc = Object.getOwnPropertyDescriptor(globalThis, "addon");

    // Capture Menu.register calls instead of touching real Zotero chrome.
    Object.defineProperty(globalThis, "ztoolkit", {
      value: {
        Menu: {
          register: (target: string, options: any) => {
            menuCalls.push({ target, options });
          },
        },
      },
      writable: true,
      configurable: true,
    });

    // getString() inside registerItemMenu reads addon.data.locale.current;
    // supply a minimal mock that returns a fixed string for any query.
    Object.defineProperty(globalThis, "addon", {
      value: {
        data: {
          locale: {
            current: {
              formatMessagesSync: (queries: any[]) =>
                queries.map(() => ({
                  value: "MOCK_STRING",
                  attributes: null,
                })),
            },
          },
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(function () {
    if (originalZtoolkitDesc) {
      Object.defineProperty(globalThis, "ztoolkit", originalZtoolkitDesc);
    } else {
      delete (globalThis as any).ztoolkit;
    }
    if (originalAddonDesc) {
      Object.defineProperty(globalThis, "addon", originalAddonDesc);
    } else {
      delete (globalThis as any).addon;
    }
  });

  function callsById(id: string): MenuCall | undefined {
    return menuCalls.find((c) => c.options && c.options.id === id);
  }

  it("registers two menu items under the 'item' context", function () {
    const mockStore = { hasUndo: () => false } as unknown as CleanSessionStore;
    registerItemMenu(
      mockStore,
      () => {},
      () => {},
    );

    assert.lengthOf(menuCalls, 2, "expected exactly two Menu.register calls");
    assert.equal(menuCalls[0].target, "item");
    assert.equal(menuCalls[1].target, "item");
  });

  it("registers 'clean' menu item with the expected id, tag, and label", function () {
    const mockStore = { hasUndo: () => false } as unknown as CleanSessionStore;
    registerItemMenu(
      mockStore,
      () => {},
      () => {},
    );

    const cleanItem = callsById("zotero-itemmenu-bibtexclean-clean");
    assert.isDefined(
      cleanItem,
      "clean menu item with id 'zotero-itemmenu-bibtexclean-clean' must be registered",
    );
    assert.equal(cleanItem!.options.tag, "menuitem");
    assert.equal(cleanItem!.options.label, "MOCK_STRING");
    assert.isFunction(
      cleanItem!.options.commandListener,
      "clean menu item must expose a commandListener",
    );
  });

  it("registers 'undo' menu item with the expected id, tag, and label", function () {
    const mockStore = { hasUndo: () => false } as unknown as CleanSessionStore;
    registerItemMenu(
      mockStore,
      () => {},
      () => {},
    );

    const undoItem = callsById("zotero-itemmenu-bibtexclean-undo");
    assert.isDefined(
      undoItem,
      "undo menu item with id 'zotero-itemmenu-bibtexclean-undo' must be registered",
    );
    assert.equal(undoItem!.options.tag, "menuitem");
    assert.equal(undoItem!.options.label, "MOCK_STRING");
    assert.isFunction(
      undoItem!.options.commandListener,
      "undo menu item must expose a commandListener",
    );
  });

  it("'undo' menu item is disabled when store has no undo", function () {
    const mockStore = { hasUndo: () => false } as unknown as CleanSessionStore;
    registerItemMenu(
      mockStore,
      () => {},
      () => {},
    );

    const undoItem = callsById("zotero-itemmenu-bibtexclean-undo");
    assert.isDefined(undoItem);
    assert.isFunction(
      undoItem!.options.isDisabled,
      "undo menu item must expose an isDisabled predicate",
    );
    assert.isTrue(
      undoItem!.options.isDisabled(),
      "isDisabled() must return true when store.hasUndo() is false",
    );
  });

  it("'undo' menu item is enabled when store has undo", function () {
    const mockStore = { hasUndo: () => true } as unknown as CleanSessionStore;
    registerItemMenu(
      mockStore,
      () => {},
      () => {},
    );

    const undoItem = callsById("zotero-itemmenu-bibtexclean-undo");
    assert.isDefined(undoItem);
    assert.isFalse(
      undoItem!.options.isDisabled(),
      "isDisabled() must return false when store.hasUndo() is true",
    );
  });

  it("clicking 'clean' invokes the onClean callback, clicking 'undo' invokes the onUndo callback", function () {
    let cleanCalled = 0;
    let undoCalled = 0;
    const mockStore = { hasUndo: () => false } as unknown as CleanSessionStore;

    registerItemMenu(
      mockStore,
      () => {
        cleanCalled += 1;
      },
      () => {
        undoCalled += 1;
      },
    );

    const cleanItem = callsById("zotero-itemmenu-bibtexclean-clean");
    const undoItem = callsById("zotero-itemmenu-bibtexclean-undo");
    assert.isDefined(cleanItem);
    assert.isDefined(undoItem);

    cleanItem!.options.commandListener();
    undoItem!.options.commandListener();
    cleanItem!.options.commandListener();

    assert.equal(cleanCalled, 2, "clean callback should fire on each click");
    assert.equal(undoCalled, 1, "undo callback should fire on click");
  });
});
