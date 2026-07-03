import { assert } from "chai";
import { CleanSessionStore } from "../src/modules/cleanSessionStore";
import type { Change } from "../src/modules/changes";

describe("CleanSessionStore", function () {
  let store: CleanSessionStore;

  beforeEach(function () {
    store = new CleanSessionStore();
  });

  it("hasUndo returns false when no operation is recorded", function () {
    assert.isFalse(store.hasUndo());
  });

  it("record stores changes and hasUndo returns true", function () {
    const changes: Change[] = [
      {
        itemLibraryID: 1,
        itemKey: "A1",
        itemTitle: "Paper",
        field: "author",
        oldValue: "old",
        newValue: "new",
      },
    ];
    store.record(changes);
    assert.isTrue(store.hasUndo());
  });

  it("current returns the recorded operation without clearing", function () {
    const changes: Change[] = [
      {
        itemLibraryID: 1,
        itemKey: "A1",
        itemTitle: "Paper",
        field: "number",
        oldValue: "第3期",
        newValue: "3",
      },
    ];
    store.record(changes);

    const op1 = store.current();
    assert.isDefined(op1);
    assert.lengthOf(op1!.changes, 1);

    // Still there after current()
    const op2 = store.current();
    assert.isDefined(op2);
  });

  it("consume returns and clears the recorded operation", function () {
    const changes: Change[] = [
      {
        itemLibraryID: 1,
        itemKey: "A1",
        itemTitle: "Paper",
        field: "number",
        oldValue: "第3期",
        newValue: "3",
      },
    ];
    store.record(changes);

    const op = store.consume();
    assert.isDefined(op);
    assert.lengthOf(op!.changes, 1);

    assert.isFalse(store.hasUndo());
    assert.isUndefined(store.consume());
  });

  it("record deep-clones changes so external mutation does not affect stored data", function () {
    const changes: Change[] = [
      {
        itemLibraryID: 1,
        itemKey: "A1",
        itemTitle: "Paper",
        field: "number",
        oldValue: "第3期",
        newValue: "3",
      },
    ];
    store.record(changes);

    // Mutate original
    changes[0].newValue = "MUTATED";

    const stored = store.consume();
    assert.equal(stored!.changes[0].newValue, "3");
  });

  it("record replaces previous operation", function () {
    const changes1: Change[] = [
      {
        itemLibraryID: 1,
        itemKey: "A1",
        itemTitle: "First",
        field: "number",
        oldValue: "1",
        newValue: "2",
      },
    ];
    const changes2: Change[] = [
      {
        itemLibraryID: 1,
        itemKey: "A2",
        itemTitle: "Second",
        field: "author",
        oldValue: "old",
        newValue: "new",
      },
    ];
    store.record(changes1);
    store.record(changes2);

    const op = store.consume();
    assert.equal(op!.changes[0].itemKey, "A2");
  });
});
