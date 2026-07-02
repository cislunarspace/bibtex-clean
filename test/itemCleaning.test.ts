import { assert } from "chai";
import {
  applyAuthorChange,
  applyChanges,
  applyRule,
  computeChanges,
  formatAuthors,
  parseAuthors,
  type Change,
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
      assert.isUndefined(applyRule("title", "第三期"));
    });

    it("removes Chinese '第' and '期' from number", function () {
      assert.equal(applyRule("number", "第3期"), "3");
    });

    it("removes Chinese '第' and '期' while preserving surrounding content", function () {
      assert.equal(applyRule("number", "第三期"), "三");
    });

    it("trims whitespace after removing '第' and '期'", function () {
      assert.equal(applyRule("number", "第 3 期"), "3");
    });

    it("returns undefined when number is already clean", function () {
      assert.isUndefined(applyRule("number", "3"));
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

    it("returns changes for multiple items and fields", function () {
      const items: CleanableItem[] = [
        {
          key: "A1",
          title: "Paper One",
          author: "Smith, John; Doe, Jane",
          number: "第三期",
        },
        { key: "A2", title: "Paper Two", author: "Smith, John and Doe, Jane" },
        { key: "A3", title: "Paper Three", number: "No. 3" },
      ];
      const changes = computeChanges(items);
      assert.lengthOf(changes, 2);
      assert.deepEqual(changes[0], {
        itemKey: "A1",
        itemTitle: "Paper One",
        field: "author",
        oldValue: "Smith, John; Doe, Jane",
        newValue: "Smith, John and Doe, Jane",
      });
      assert.deepEqual(changes[1], {
        itemKey: "A1",
        itemTitle: "Paper One",
        field: "number",
        oldValue: "第三期",
        newValue: "三",
      });
    });
  });

  describe("formatAuthors", function () {
    it("formats author creators as a semicolon-separated string", function () {
      const authors = formatAuthors([
        { creatorType: "author", firstName: "John", lastName: "Smith" },
        { creatorType: "author", firstName: "Jane", lastName: "Doe" },
      ]);
      assert.equal(authors, "Smith, John; Doe, Jane");
    });

    it("ignores non-author creators", function () {
      const authors = formatAuthors([
        { creatorType: "author", firstName: "John", lastName: "Smith" },
        { creatorType: "editor", firstName: "Jane", lastName: "Doe" },
      ]);
      assert.equal(authors, "Smith, John");
    });

    it("returns undefined when there are no authors", function () {
      assert.isUndefined(
        formatAuthors([
          { creatorType: "editor", firstName: "Jane", lastName: "Doe" },
        ]),
      );
    });
  });

  describe("parseAuthors", function () {
    it("splits authors by ' and ' and parses last, first format", function () {
      const authors = parseAuthors("Smith, John and Doe, Jane");
      assert.deepEqual(authors, [
        { creatorType: "author", lastName: "Smith", firstName: "John" },
        { creatorType: "author", lastName: "Doe", firstName: "Jane" },
      ]);
    });

    it("falls back to single-field name when there is no comma", function () {
      const authors = parseAuthors("ACME Corporation");
      assert.deepEqual(authors, [
        { creatorType: "author", name: "ACME Corporation" },
      ]);
    });
  });

  describe("applyAuthorChange", function () {
    it("replaces authors in place and preserves non-author creator order", function () {
      const creators: _ZoteroTypes.Item.CreatorJSON[] = [
        { creatorType: "author", firstName: "John", lastName: "Smith" },
        { creatorType: "editor", firstName: "Jane", lastName: "Doe" },
        { creatorType: "author", firstName: "Bob", lastName: "Brown" },
      ];
      const item = createMockItem(creators);
      applyAuthorChange(item, "Smith, John and Brown, Bob");
      assert.deepEqual(creators, [
        { creatorType: "author", lastName: "Smith", firstName: "John" },
        { creatorType: "editor", firstName: "Jane", lastName: "Doe" },
        { creatorType: "author", lastName: "Brown", firstName: "Bob" },
      ]);
    });

    it("throws when the new author count does not match", function () {
      const creators: _ZoteroTypes.Item.CreatorJSON[] = [
        { creatorType: "author", firstName: "John", lastName: "Smith" },
      ];
      const item = createMockItem(creators);
      assert.throws(() => {
        applyAuthorChange(item, "Smith, John and Doe, Jane");
      }, /Author count mismatch/);
    });
  });

  describe("applyChanges", function () {
    let originalGetAsync: typeof Zotero.Items.getAsync;

    beforeEach(function () {
      originalGetAsync = Zotero.Items.getAsync;
    });

    afterEach(function () {
      Zotero.Items.getAsync = originalGetAsync;
    });

    it("keeps successful changes when other items fail", async function () {
      const goodItem = createMockSavableItem({ key: "A1", number: "3" });
      const badItem = createMockSavableItem({
        key: "A2",
        number: "5",
        saveError: new Error("save failed"),
      });

      Zotero.Items.getAsync = async (key: string) => {
        if (key === "A1") return goodItem.item;
        if (key === "A2") return badItem.item;
        throw new Error(`Item ${key} not found`);
      };

      const changes: Change[] = [
        {
          itemKey: "A1",
          itemTitle: "Good Paper",
          field: "number",
          oldValue: "第三期",
          newValue: "3",
        },
        {
          itemKey: "A2",
          itemTitle: "Bad Paper",
          field: "number",
          oldValue: "第五期",
          newValue: "5",
        },
      ];

      const { succeeded, failed } = await applyChanges(changes);

      assert.lengthOf(succeeded, 1);
      assert.equal(succeeded[0].itemKey, "A1");
      assert.equal(goodItem.getField("number"), "3");

      assert.lengthOf(failed, 1);
      assert.equal(failed[0].change.itemKey, "A2");
      assert.match(failed[0].error.message, /save failed/);
    });
  });
});

function createMockItem(
  creators: _ZoteroTypes.Item.CreatorJSON[],
): Zotero.Item {
  return {
    getCreatorsJSON: () => creators,
    setCreators: (newCreators: _ZoteroTypes.Item.CreatorJSON[]) => {
      creators.length = 0;
      creators.push(...newCreators);
    },
  } as unknown as Zotero.Item;
}

function createMockSavableItem({
  key,
  number,
  saveError,
}: {
  key: string;
  number: string;
  saveError?: Error;
}) {
  const fields: Record<string, string> = { number };
  const item = {
    key,
    getField: (field: string) => fields[field],
    setField: (field: string, value: string) => {
      fields[field] = value;
    },
    saveTx: async () => {
      if (saveError) {
        throw saveError;
      }
    },
  } as unknown as Zotero.Item;
  return { item, getField: (field: string) => fields[field] };
}
