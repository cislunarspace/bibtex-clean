import { assert } from "chai";
import {
  applyRule,
  computeChanges,
  type CleanableItem,
} from "../src/modules/itemCleaning";

describe("itemCleaning", function () {
  describe("applyRule", function () {
    it("replaces semicolons with ' and ' in author", function () {
      assert.equal(
        applyRule("author", "Smith, John; Doe, Jane"),
        "Smith, John and Doe, Jane",
      );
    });

    it("returns undefined when author has no semicolon", function () {
      assert.isUndefined(applyRule("author", "Smith, John and Doe, Jane"));
    });

    it("returns undefined for unsupported fields", function () {
      assert.isUndefined(applyRule("number", "第三期"));
    });
  });

  describe("computeChanges", function () {
    it("returns a single change for one dirty author field", function () {
      const items: CleanableItem[] = [
        { key: "A1", title: "Paper One", author: "Smith, John; Doe, Jane" },
      ];
      const changes = computeChanges(items);
      assert.lengthOf(changes, 1);
      assert.deepEqual(changes[0], {
        itemKey: "A1",
        itemTitle: "Paper One",
        field: "author",
        oldValue: "Smith, John; Doe, Jane",
        newValue: "Smith, John and Doe, Jane",
      });
    });

    it("returns only changes for dirty fields across multiple items", function () {
      const items: CleanableItem[] = [
        { key: "A1", title: "Dirty", author: "Smith, John; Doe, Jane" },
        { key: "A2", title: "Clean", author: "Smith, John and Doe, Jane" },
      ];
      const changes = computeChanges(items);
      assert.lengthOf(changes, 1);
      assert.equal(changes[0].itemKey, "A1");
    });

    it("returns an empty array when no changes are needed", function () {
      const items: CleanableItem[] = [
        { key: "A1", title: "Clean", author: "Smith, John and Doe, Jane" },
      ];
      assert.deepEqual(computeChanges(items), []);
    });

    it("returns an empty array for empty input", function () {
      assert.deepEqual(computeChanges([]), []);
    });
  });
});
