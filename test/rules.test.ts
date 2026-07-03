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

    it("collapses consecutive semicolons without creating empty authors", function () {
      assert.equal(
        applyRule("author", "闻国光;;过仕宁"),
        "闻国光 and 过仕宁",
      );
    });

    it("handles leading semicolon without creating empty author", function () {
      assert.equal(applyRule("author", ";闻国光"), "闻国光");
    });

    it("handles trailing semicolon without creating empty author", function () {
      assert.equal(applyRule("author", "闻国光;"), "闻国光");
    });

    it("handles multiple consecutive semicolons", function () {
      assert.equal(
        applyRule("author", "A;;;B"),
        "A and B",
      );
    });
  });
});
