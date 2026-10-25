import { expect, it } from "vite-plus/test";

import { shouldUseMarkdownFileBrowserPrimaryAction } from "./MarkdownFileLink.logic";

it("opens PDFs in the file panel and uses the browser only when no other destination exists", () => {
  expect(
    shouldUseMarkdownFileBrowserPrimaryAction({
      iconPath: "report.pdf",
      canOpenInEditor: true,
      canOpenInBrowser: true,
      canOpenInPanel: true,
    }),
  ).toBe(false);
  expect(
    shouldUseMarkdownFileBrowserPrimaryAction({
      iconPath: "report.pdf",
      canOpenInEditor: false,
      canOpenInBrowser: true,
      canOpenInPanel: true,
    }),
  ).toBe(false);
  expect(
    shouldUseMarkdownFileBrowserPrimaryAction({
      iconPath: "report.pdf",
      canOpenInEditor: false,
      canOpenInBrowser: true,
      canOpenInPanel: false,
    }),
  ).toBe(true);
});
