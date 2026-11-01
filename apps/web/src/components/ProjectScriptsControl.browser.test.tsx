import { EnvironmentId, type ProjectScript } from "@t3tools/contracts";
import { page } from "vite-plus/test/browser";
import { describe, expect, it, vi } from "vite-plus/test";

import { render } from "../../test/render";
import ProjectScriptsControl, { type ProjectScriptActionResult } from "./ProjectScriptsControl";

const script = (id: string, name: string): ProjectScript => ({
  id,
  name,
  command: `pnpm ${id}`,
  icon: "play",
  runOnWorktreeCreate: false,
});

const scripts = [script("dev", "Dev"), script("test", "Test"), script("lint", "Lint")];
const settled = async () => ({ _tag: "Success", value: undefined }) as ProjectScriptActionResult;

describe("ProjectScriptsControl panel", () => {
  it("runs any script with one click instead of hiding the rest in a menu", async () => {
    const onRunScript = vi.fn();
    await using _screen = await render(
      <ProjectScriptsControl
        environmentId={EnvironmentId.make("local")}
        displayMode="panel"
        scripts={scripts}
        preferredScriptId="dev"
        onRunScript={onRunScript}
        onAddScript={settled}
        onUpdateScript={settled}
        onDeleteScript={settled}
      />,
    );

    for (const { name } of scripts) {
      await expect.element(page.getByRole("button", { name: `Run ${name}` })).toBeVisible();
    }
    await page.getByRole("button", { name: "Run Lint" }).click();
    expect(onRunScript).toHaveBeenCalledWith(scripts[2]);
    await expect.element(page.getByRole("button", { name: "Add project script" })).toBeVisible();
  });
});
