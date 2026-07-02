import { assert } from "chai";
import {
  applyAuthorChange,
  applyChanges,
  undoChanges,
} from "../src/modules/zoteroWriter";
import type { FieldChange } from "../src/modules/changes";

describe("zoteroWriter", function () {
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

      const changes: FieldChange[] = [
        {
          itemKey: "A1",
          field: "number",
          oldValue: "第三期",
          newValue: "3",
        },
        {
          itemKey: "A2",
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

  describe("undoChanges", function () {
    let originalGetAsync: typeof Zotero.Items.getAsync;

    beforeEach(function () {
      originalGetAsync = Zotero.Items.getAsync;
    });

    afterEach(function () {
      Zotero.Items.getAsync = originalGetAsync;
    });

    it("restores old field values", async function () {
      const item = createMockSavableItem({ key: "A1", number: "3" });

      Zotero.Items.getAsync = async (key: string) => {
        if (key === "A1") return item.item;
        throw new Error(`Item ${key} not found`);
      };

      const changes: FieldChange[] = [
        {
          itemKey: "A1",
          field: "number",
          oldValue: "第三期",
          newValue: "3",
        },
      ];

      const { succeeded, failed } = await undoChanges(changes);

      assert.lengthOf(succeeded, 1);
      assert.lengthOf(failed, 0);
      assert.equal(item.getField("number"), "第三期");
    });

    it("restores author creators from the old formatted value", async function () {
      const item = createMockSavableItem({
        key: "A1",
        creators: [
          { creatorType: "author", lastName: "Smith", firstName: "John" },
          { creatorType: "author", lastName: "Doe", firstName: "Jane" },
        ],
      });

      Zotero.Items.getAsync = async (key: string) => {
        if (key === "A1") return item.item;
        throw new Error(`Item ${key} not found`);
      };

      const changes: FieldChange[] = [
        {
          itemKey: "A1",
          field: "author",
          oldValue: "Smith, John; Doe, Jane",
          newValue: "Smith, John and Doe, Jane",
        },
      ];

      const { succeeded, failed } = await undoChanges(changes);

      assert.lengthOf(succeeded, 1);
      assert.lengthOf(failed, 0);
      assert.deepEqual(item.getCreatorsJSON(), [
        { creatorType: "author", lastName: "Smith", firstName: "John" },
        { creatorType: "author", lastName: "Doe", firstName: "Jane" },
      ]);
    });

    it("keeps successful undos when other items fail", async function () {
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

      const changes: FieldChange[] = [
        {
          itemKey: "A1",
          field: "number",
          oldValue: "第三期",
          newValue: "3",
        },
        {
          itemKey: "A2",
          field: "number",
          oldValue: "第五期",
          newValue: "5",
        },
      ];

      const { succeeded, failed } = await undoChanges(changes);

      assert.lengthOf(succeeded, 1);
      assert.equal(succeeded[0].itemKey, "A1");
      assert.equal(goodItem.getField("number"), "第三期");

      assert.lengthOf(failed, 1);
      assert.equal(failed[0].change.itemKey, "A2");
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
  creators,
  saveError,
}: {
  key: string;
  number?: string;
  creators?: _ZoteroTypes.Item.CreatorJSON[];
  saveError?: Error;
}) {
  const fields: Record<string, string> = number ? { number } : {};
  const itemCreators = creators ? [...creators] : [];
  const item = {
    key,
    getField: (field: string) => fields[field],
    setField: (field: string, value: string) => {
      fields[field] = value;
    },
    getCreatorsJSON: () => itemCreators,
    setCreators: (newCreators: _ZoteroTypes.Item.CreatorJSON[]) => {
      itemCreators.length = 0;
      itemCreators.push(...newCreators);
    },
    saveTx: async () => {
      if (saveError) {
        throw saveError;
      }
    },
  } as unknown as Zotero.Item;
  return {
    item,
    getField: (field: string) => fields[field],
    getCreatorsJSON: () => itemCreators,
  };
}
