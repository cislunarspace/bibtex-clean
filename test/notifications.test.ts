import { assert } from "chai";
import {
  showSuccess,
  showInfo,
  showErrorDetails,
  showUndoableSuccess,
} from "../src/utils/notifications";
import type { Change } from "../src/modules/changes";

/**
 * Regression tests for notification helpers.
 *
 * `zotero-plugin-toolkit`'s ProgressWindowHelper only recognises a few icon
 * types in its internal `icons` map (`success`, `fail`, and whatever we register
 * via `setIconURI`). Passing an unrecognised type such as `"error"` makes the
 * helper fall back to an empty icon string, which triggers a Zotero bug that
 * shows an XML parsing error window instead of the intended notification.
 */

describe("notifications", function () {
  let originalZtoolkit: PropertyDescriptor | undefined;
  let originalAddon: PropertyDescriptor | undefined;
  let createdWindows: MockProgressWindow[];

  beforeEach(function () {
    createdWindows = [];

    originalZtoolkit = Object.getOwnPropertyDescriptor(globalThis, "ztoolkit");
    originalAddon = Object.getOwnPropertyDescriptor(globalThis, "addon");

    Object.defineProperty(globalThis, "ztoolkit", {
      value: {
        ProgressWindow: function (name: string, opts?: any) {
          const pw = new MockProgressWindow(name, opts);
          createdWindows.push(pw);
          return pw;
        },
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, "addon", {
      value: {
        data: {
          config: { addonName: "BibTeX Clean" },
        },
      },
      writable: true,
      configurable: true,
    });
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
  });

  it("showSuccess uses a recognised progress type", function () {
    showSuccess("Done");
    assert.lengthOf(createdWindows, 1);
    assert.deepEqual(createdWindows[0].createLineCalls, [
      { text: "Done", type: "success" },
    ]);
  });

  it("showInfo uses a recognised progress type", function () {
    showInfo("No changes");
    assert.lengthOf(createdWindows, 1);
    const call = createdWindows[0].createLineCalls[0];
    assert.isDefined(call);
    assert.isTrue(
      isRecognisedProgressType(call.type, call.icon),
      `type=${call.type} icon=${call.icon} should not fall back to empty icon`,
    );
  });

  it("showErrorDetails uses recognised progress types only", function () {
    const failed = [
      {
        change: {
          itemKey: "A1",
          itemTitle: "Paper One",
          field: "number",
          oldValue: "第3期",
          newValue: "3",
        } as Change,
        error: new Error("save failed"),
      },
    ];

    showErrorDetails(failed);

    assert.lengthOf(createdWindows, 1);
    for (const call of createdWindows[0].createLineCalls) {
      assert.isTrue(
        isRecognisedProgressType(call.type, call.icon),
        `type=${call.type} icon=${call.icon} should not fall back to empty icon`,
      );
    }
  });

  it("showUndoableSuccess uses a recognised progress type", function () {
    showUndoableSuccess("Cleaned", () => {});
    assert.lengthOf(createdWindows, 1);
    const call = createdWindows[0].createLineCalls[0];
    assert.isDefined(call);
    assert.isTrue(
      isRecognisedProgressType(call.type, call.icon),
      `type=${call.type} icon=${call.icon} should not fall back to empty icon`,
    );
  });
});

function isRecognisedProgressType(
  type: string | undefined,
  icon: string | undefined,
): boolean {
  // Explicit icon wins; otherwise type must be one of the built-ins
  // (success/fail) or "default" which we register in createZToolkit.
  if (icon) return true;
  return type === "success" || type === "fail" || type === "default";
}

class MockProgressWindow {
  public createLineCalls: Array<{
    text?: string;
    type?: string;
    icon?: string;
  }> = [];

  constructor(_name: string, _opts?: any) {}

  createLine(options: { text?: string; type?: string; icon?: string }): this {
    this.createLineCalls.push(options);
    return this;
  }

  addDescription(_text: string): this {
    return this;
  }

  show(): this {
    return this;
  }
}
