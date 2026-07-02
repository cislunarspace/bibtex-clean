import { assert } from "chai";
import { CleanSessionStore } from "../src/modules/cleanSessionStore";
import type { Change } from "../src/modules/itemCleaning";

describe("CleanSessionStore", function () {
  let store: CleanSessionStore;

  beforeEach(function () {
    store = new CleanSessionStore();
  });

  const sampleChanges: Change[] = [
    {
      itemKey: "A1",
      itemTitle: "Paper One",
      field: "author",
      oldValue: "Smith, John; Doe, Jane",
      newValue: "Smith, John and Doe, Jane",
    },
  ];

  describe("hasUndo", function () {
    it("returns false when no operation is recorded", function () {
      assert.isFalse(store.hasUndo());
    });

    it("returns true after recording", function () {
      store.record(sampleChanges);
      assert.isTrue(store.hasUndo());
    });

    it("returns false after consume", function () {
      store.record(sampleChanges);
      store.consume();
      assert.isFalse(store.hasUndo());
    });
  });

  describe("current", function () {
    it("returns undefined when empty", function () {
      assert.isUndefined(store.current());
    });

    it("returns the recorded operation without clearing", function () {
      store.record(sampleChanges);
      const op = store.current();
      assert.isDefined(op);
      assert.lengthOf(op!.changes, 1);
      // still available after peek
      assert.isTrue(store.hasUndo());
    });
  });

  describe("consume", function () {
    it("returns the operation and clears the store", function () {
      store.record(sampleChanges);
      const op = store.consume();
      assert.isDefined(op);
      assert.lengthOf(op!.changes, 1);
      assert.isFalse(store.hasUndo());
    });

    it("returns undefined when empty", function () {
      assert.isUndefined(store.consume());
    });
  });

  describe("record", function () {
    it("deep-clones changes so mutations do not affect the store", function () {
      const changes: Change[] = [
        {
          itemKey: "A1",
          itemTitle: "Paper",
          field: "number",
          oldValue: "第三期",
          newValue: "3",
        },
      ];
      store.record(changes);

      // Mutate the original
      changes[0].newValue = "MUTATED";

      const stored = store.consume()!;
      assert.equal(stored.changes[0].newValue, "3");
    });

    it("replaces a previous recording", function () {
      store.record(sampleChanges);
      const newChanges: Change[] = [
        {
          itemKey: "A2",
          itemTitle: "Paper Two",
          field: "number",
          oldValue: "第五期",
          newValue: "5",
        },
      ];
      store.record(newChanges);

      const op = store.consume()!;
      assert.equal(op.changes[0].itemKey, "A2");
    });
  });
});
