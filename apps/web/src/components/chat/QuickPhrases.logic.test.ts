import { describe, expect, it } from "vite-plus/test";

import { parseQuickPhrases, quickPhraseSuffix } from "./QuickPhrases.logic";

describe("parseQuickPhrases", () => {
  it("keeps one trimmed phrase per line and drops blanks and repeats", () => {
    expect(parseQuickPhrases("  yes, continue \n\n\r\nexplain\nyes, continue\n")).toEqual([
      "yes, continue",
      "explain",
    ]);
  });
});

describe("quickPhraseSuffix", () => {
  it("starts a new line only after typed text", () => {
    expect(quickPhraseSuffix("", "yes")).toBe("yes");
    expect(quickPhraseSuffix("draft\n", "yes")).toBe("yes");
    expect(quickPhraseSuffix("fix the tests", "yes")).toBe("\nyes");
  });
});
