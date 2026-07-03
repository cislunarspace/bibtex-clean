import { assert } from "chai";
import { computeChanges, type CleanableItem } from "../src/modules/changes";

describe("changes", function () {
  describe("computeChanges", function () {
    it("returns a single change for one dirty author field", function () {
      const items: CleanableItem[] = [
        {
          libraryID: 1,
          key: "A1",
          title: "Paper One",
          author: "Smith, John; Doe, Jane",
        },
      ];
      const changes = computeChanges(items);
      assert.lengthOf(changes, 1);
      assert.deepEqual(changes[0], {
        itemLibraryID: 1,
        itemKey: "A1",
        itemTitle: "Paper One",
        field: "author",
        oldValue: "Smith, John; Doe, Jane",
        newValue: "Smith, John and Doe, Jane",
      });
    });

    it("returns only changes for dirty fields across multiple items", function () {
      const items: CleanableItem[] = [
        {
          libraryID: 1,
          key: "A1",
          title: "Dirty",
          author: "Smith, John; Doe, Jane",
        },
        {
          libraryID: 1,
          key: "A2",
          title: "Clean",
          author: "Smith, John and Doe, Jane",
        },
      ];
      const changes = computeChanges(items);
      assert.lengthOf(changes, 1);
      assert.equal(changes[0].itemKey, "A1");
    });

    it("returns an empty array when no changes are needed", function () {
      const items: CleanableItem[] = [
        {
          libraryID: 1,
          key: "A1",
          title: "Clean",
          author: "Smith, John and Doe, Jane",
        },
      ];
      assert.deepEqual(computeChanges(items), []);
    });

    it("returns an empty array for empty input", function () {
      assert.deepEqual(computeChanges([]), []);
    });

    it("returns changes for multiple items and fields", function () {
      const items: CleanableItem[] = [
        {
          libraryID: 1,
          key: "A1",
          title: "Paper One",
          author: "Smith, John; Doe, Jane",
          number: "第三期",
        },
        {
          libraryID: 1,
          key: "A2",
          title: "Paper Two",
          author: "Smith, John and Doe, Jane",
        },
        { libraryID: 1, key: "A3", title: "Paper Three", number: "No. 3" },
      ];
      const changes = computeChanges(items);
      assert.lengthOf(changes, 2);
      assert.deepEqual(changes[0], {
        itemLibraryID: 1,
        itemKey: "A1",
        itemTitle: "Paper One",
        field: "author",
        oldValue: "Smith, John; Doe, Jane",
        newValue: "Smith, John and Doe, Jane",
      });
      assert.deepEqual(changes[1], {
        itemLibraryID: 1,
        itemKey: "A1",
        itemTitle: "Paper One",
        field: "number",
        oldValue: "第三期",
        newValue: "三",
      });
    });
  });
});
