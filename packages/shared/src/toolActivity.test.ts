import { describe, expect, it } from "vite-plus/test";

import {
  classifyToolActivity,
  dynamicToolSurface,
  mergeToolActivityData,
  skillUse,
} from "./toolActivity.ts";

describe("toolActivity", () => {
  it.each([
    [
      "Claude's Skill tool",
      { type: "dynamic_tool", toolName: "Skill", input: { skill: "commit" } },
    ],
    [
      "Muse's read_skill tool",
      { type: "dynamic_tool", toolName: "read_skill", input: { name: "commit" } },
    ],
    [
      "a read tool on SKILL.md",
      {
        type: "dynamic_tool",
        toolName: "read",
        input: { path: "C:\\Users\\me\\.agents\\skills\\commit\\SKILL.md" },
      },
    ],
    [
      "a shell read of SKILL.md",
      {
        type: "command_execution",
        input: `"C:\\pwsh.exe" -NoProfile -Command "Get-Content 'C:/me/skills/commit/SKILL.md' -Encoding UTF8 | Select-Object -First 80"`,
      },
    ],
    [
      "a wrapped sed read",
      {
        type: "command_execution",
        input: "/bin/zsh -lc \"sed -n '1,200p' ~/.agents/skills/commit/SKILL.md\"",
      },
    ],
  ])("recognizes a skill load from %s", (_source, item) => {
    expect(skillUse(item)).toMatchObject({ skills: [{ name: "commit" }], exclusive: true });
  });

  it("keeps a command that also does other work while naming the skills it read", () => {
    expect(
      skillUse({
        type: "command_execution",
        input:
          "pwsh -Command 'Get-Content \"C:/my skills/unslop/SKILL.md\"; Get-Content C:/s/tdd/SKILL.md\nscp host:/a.txt .'",
      }),
    ).toEqual({
      skills: [
        { name: "unslop", path: "C:/my skills/unslop/SKILL.md" },
        { name: "tdd", path: "C:/s/tdd/SKILL.md" },
      ],
      exclusive: false,
    });
  });

  it.each([
    [
      "a search of skill files",
      { type: "command_execution", input: "rg -n commit skills/commit/SKILL.md" },
    ],
    [
      "a read of another file",
      { type: "dynamic_tool", toolName: "Read", input: { file_path: "src/SKILL.md.ts" } },
    ],
    [
      "an edit of SKILL.md",
      { type: "dynamic_tool", toolName: "Edit", input: { file_path: "skills/commit/SKILL.md" } },
    ],
  ])("ignores %s", (_source, item) => {
    expect(skillUse(item)).toBeUndefined();
  });

  it("classifies from kind and toolName without sniffing titles", () => {
    expect(classifyToolActivity({ data: { kind: "read" } })).toBe("read");
    expect(classifyToolActivity({ data: { toolName: "Grep" } })).toBe("search");
    expect(classifyToolActivity({ data: { toolName: "Read" } })).toBe("read");
    for (const toolName of ["github.read_file", "mongodb.find", "mcp__github__read_file"]) {
      expect(classifyToolActivity({ data: { toolName } })).toBe("other");
    }
    expect(classifyToolActivity({ title: "Find", data: {} })).toBe("other");
  });

  it("classifies Claude search tools ahead of their broad file-read request kind", () => {
    for (const toolName of ["Glob", "Grep", "LS"]) {
      expect(classifyToolActivity({ requestKind: "file-read", data: { toolName } })).toBe("search");
    }
    expect(classifyToolActivity({ requestKind: "file-read", data: { toolName: "Read" } })).toBe(
      "read",
    );
  });

  it("keeps the previous rawInput when a later update is empty and replaces it otherwise", () => {
    expect(
      mergeToolActivityData({ rawInput: { path: "src/a.ts" } }, { rawInput: {}, kind: "read" }),
    ).toEqual({
      rawInput: { path: "src/a.ts" },
      kind: "read",
    });
    expect(
      mergeToolActivityData({ rawInput: { path: "src/a.ts" } }, { rawInput: { startLine: 4 } }),
    ).toEqual({ rawInput: { startLine: 4 } });
  });

  it("recognizes computer-use REPL calls before result metadata exists", () => {
    expect(dynamicToolSurface("cua_repl.js", {})).toBe("computer");
    for (const name of ["node_repl.js", "js"]) {
      expect(dynamicToolSurface(name, { code: "await sky.get_app_state(app);" })).toBe("computer");
      expect(dynamicToolSurface(name, { code: "const sky = await import('@oai/sky');" })).toBe(
        "computer",
      );
      expect(dynamicToolSurface(name, { code: "await fs.readFile(path);" })).toBeUndefined();
    }
    expect(dynamicToolSurface("github.js", { code: "await sky.click(app);" })).toBeUndefined();
  });
});
