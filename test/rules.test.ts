import { assert } from "chai";
import { applyRule } from "../src/modules/rules";

describe("rules", function () {
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
});
