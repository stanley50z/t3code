import { EnvironmentId, type ProjectScript } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/reactivity";
import { describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

import { act, render } from "../../test/render";
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

it.each(["edit", "dismiss", "newer import fails first"] as const)(
  "keeps a failed import from replacing a newer action after %s",
  async (nextAction) => {
    const older = Promise.withResolvers<ProjectScriptActionResult>();
    const newer = Promise.withResolvers<ProjectScriptActionResult>();
    await using screen = await render(
      <ProjectScriptsControl
        environmentId={EnvironmentId.make("test")}
        displayMode="panel"
        scripts={[
          {
            id: "local-check",
            name: "Local check",
            command: "echo local",
            icon: "play",
            runOnWorktreeCreate: false,
          },
        ]}
        fileScripts={[
          { name: "Shared build", command: "echo build" },
          { name: "Shared lint", command: "echo lint" },
        ]}
        onRunScript={() => {}}
        onAddScript={({ name }) => (name === "Shared build" ? older.promise : newer.promise)}
        onUpdateScript={async () => AsyncResult.success(undefined)}
        onDeleteScript={async () => AsyncResult.success(undefined)}
      />,
    );

    const imports = screen.getByRole("button", { name: "Import from t3.json" });
    const dialog = page.getByRole("dialog");
    const name = dialog.getByRole("textbox", { name: "Name" });
    const failure = AsyncResult.failure<void, unknown>(
      Cause.fail(new Error("Settings write failed")),
    );

    await imports.click();
    await page.getByRole("menuitem", { name: /Shared build/ }).click();

    switch (nextAction) {
      case "edit":
        await page.getByRole("button", { name: "Edit Local check" }).click();
        await act(async () => older.resolve(failure));
        expect(name.query()).toHaveProperty("value", "Local check");
        break;
      case "dismiss":
        await page.getByRole("button", { name: "Add project script" }).click();
        await expect.element(dialog).toBeVisible();
        await userEvent.keyboard("{Escape}");
        await expect.element(dialog).not.toBeInTheDocument();
        await act(async () => older.resolve(failure));
        expect(dialog.query() === null).toBe(true);
        break;
      case "newer import fails first":
        await imports.click();
        await page.getByRole("menuitem", { name: /Shared lint/ }).click();
        await act(async () => newer.resolve(failure));
        await act(async () => older.resolve(failure));
        expect(name.query()).toHaveProperty("value", "Shared lint");
        break;
    }
  },
);
