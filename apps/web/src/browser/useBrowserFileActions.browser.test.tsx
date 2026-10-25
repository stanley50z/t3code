import { AuthPreviewOperateScope, EnvironmentId, ThreadId } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/reactivity";
import { useEffect } from "react";
import { expect, it, vi } from "vite-plus/test";

import { render, stubGlobal } from "../../test/render";

const state = vi.hoisted(() => ({
  createUrl: vi.fn(),
  openIntegrated: vi.fn(),
  openExternal: vi.fn(),
  copy: vi.fn(),
  toast: vi.fn(),
  canRead: true,
  canPreview: true,
  httpBaseUrl: "http://localhost:3773",
  actions: undefined as
    | ReturnType<typeof import("./useBrowserFileActions").useBrowserFileActions>
    | undefined,
}));
vi.mock("~/state/session", () => ({
  usePreparedConnection: () => ({ _tag: "Some", value: { httpBaseUrl: state.httpBaseUrl } }),
  useEnvironmentScope: (_: unknown, scope: string) =>
    scope === AuthPreviewOperateScope ? state.canPreview : state.canRead,
  readEnvironmentScope: (_: unknown, scope: string) =>
    scope === AuthPreviewOperateScope ? state.canPreview : state.canRead,
}));
vi.mock("~/assets/assetUrls", async () => ({
  resolveAssetUrl: (await import("@t3tools/client-runtime/state/assets")).resolveAssetUrl,
}));
vi.mock("~/state/assets", () => ({ assetEnvironment: { createUrl: "createUrl" } }));
vi.mock("~/state/preview", () => ({ previewEnvironment: { open: "open" } }));
vi.mock("~/state/use-atom-query-runner", () => ({ useAtomQueryRunner: () => state.createUrl }));
vi.mock("~/state/use-atom-command", () => ({ useAtomCommand: () => vi.fn() }));
vi.mock("~/browser/previewRuntime", () => ({ isPreviewAvailableFor: () => true }));
vi.mock("~/browser/openFileInPreview", () => ({ openUrlInPreview: state.openIntegrated }));
vi.mock("~/hooks/useCopyToClipboard", () => ({ writeTextToClipboard: state.copy }));
vi.mock("~/components/ui/toast", () => ({ toastManager: { add: state.toast } }));
vi.mock("~/localApi", () => ({
  readLocalApi: () => ({ shell: { openExternal: state.openExternal } }),
}));

import { useBrowserFileActions } from "./useBrowserFileActions";

const threadRef = { environmentId: EnvironmentId.make("local"), threadId: ThreadId.make("thread") };
const assetUrl = "http://localhost:3773/api/assets/token/report.html";

function Harness({ draft = false }: { draft?: boolean }) {
  const value = useBrowserFileActions(
    threadRef.environmentId,
    "/work",
    draft ? undefined : threadRef,
  );
  useEffect(() => {
    state.actions = value;
  }, [value]);
  return null;
}

function setup() {
  state.httpBaseUrl = "http://localhost:3773";
  state.canRead = true;
  state.canPreview = true;
  state.actions = undefined;
  state.createUrl
    .mockReset()
    .mockResolvedValue(AsyncResult.success({ relativeUrl: "/api/assets/token/report.html" }));
  state.openIntegrated.mockReset().mockResolvedValue(AsyncResult.success(undefined));
  state.openExternal.mockReset().mockResolvedValue(undefined);
  state.copy.mockReset().mockResolvedValue(undefined);
  state.toast.mockReset();
  // The desktop shell opens URLs through openExternal; tests without it act as a web client.
  return stubGlobal("desktopBridge", {});
}

const actions = () => state.actions!;
// The hook harness renders nothing routable, so it runs without a router.
const renderHarness = (draft = false) => render(<Harness draft={draft} />, { router: false });

it("opens workspace HTML through T3 with a URL that retains sibling asset access", async () => {
  using _setup = setup();
  await using _screen = await renderHarness();
  await actions().activate("report.html", "integrated");
  expect(state.createUrl).toHaveBeenCalledWith({
    environmentId: threadRef.environmentId,
    input: {
      resource: { _tag: "workspace-file", threadId: threadRef.threadId, path: "/work/report.html" },
    },
  });
  expect(state.openIntegrated).toHaveBeenCalledWith(
    expect.objectContaining({ threadRef, url: assetUrl }),
  );
  expect(state.openExternal).not.toHaveBeenCalled();
});

it("opens externally without needing permission to operate the T3 browser", async () => {
  using _setup = setup();
  state.canPreview = false;
  await using _screen = await renderHarness();
  expect(actions().canOpenIntegrated).toBe(false);
  await actions().activate("report.html", "external");
  expect(state.openExternal).toHaveBeenCalledWith(assetUrl);
  expect(state.openIntegrated).not.toHaveBeenCalled();
});

it("copies a usable browser URL without opening a browser", async () => {
  using _setup = setup();
  await using _screen = await renderHarness();
  await actions().activate("report.html", "copy");
  expect(state.copy).toHaveBeenCalledWith(assetUrl);
  expect(state.openIntegrated).not.toHaveBeenCalled();
  expect(state.openExternal).not.toHaveBeenCalled();
});

it("uses a standalone media resource for HTML outside the workspace", async () => {
  using _setup = setup();
  await using _screen = await renderHarness();
  await actions().activate("/tmp/report.html", "external");
  expect(state.createUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      input: {
        resource: { _tag: "media-file", threadId: threadRef.threadId, path: "/tmp/report.html" },
      },
    }),
  );
});

it("can open a draft workspace file externally before a thread exists", async () => {
  using _setup = setup();
  await using _screen = await renderHarness(true);
  await actions().activate("report.html", "external");
  expect(state.createUrl).toHaveBeenCalledWith(
    expect.objectContaining({
      input: {
        resource: { _tag: "draft-workspace-file", cwd: "/work", path: "/work/report.html" },
      },
    }),
  );
});

it("uses the owning environment origin for a remote HTML file", async () => {
  using _setup = setup();
  state.httpBaseUrl = "https://remote.example.test/t3/";
  await using _screen = await renderHarness();
  await actions().activate("report.html", "external");
  expect(state.openExternal).toHaveBeenCalledWith(
    "https://remote.example.test/api/assets/token/report.html",
  );
});

it("does not read or open a file without filesystem permission", async () => {
  using _setup = setup();
  state.canRead = false;
  await using _screen = await renderHarness();
  await actions().activate("report.html", "external");
  expect(state.createUrl).not.toHaveBeenCalled();
  expect(state.openExternal).not.toHaveBeenCalled();
});

it("does not open a URL after file access is revoked during signing", async () => {
  using _setup = setup();
  let finish: (value: unknown) => void = () => {
    throw new Error("Signing not started");
  };
  state.createUrl.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await using _screen = await renderHarness();
  const pending = actions().activate("report.html", "external");
  state.canRead = false;
  finish(AsyncResult.success({ relativeUrl: "/api/assets/token/report.html" }));
  await pending;
  expect(state.openExternal).not.toHaveBeenCalled();
  expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
});

it("rejects non-HTTP asset URLs", async () => {
  using _setup = setup();
  state.createUrl.mockResolvedValue(AsyncResult.success({ relativeUrl: "javascript:alert(1)" }));
  await using _screen = await renderHarness();
  await actions().activate("report.html", "external");
  expect(state.openExternal).not.toHaveBeenCalled();
  expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
});

function webTab(closed = false) {
  return { opener: {}, closed, location: { replace: vi.fn() }, close: vi.fn() };
}

it("reserves a web tab during the gesture and closes it when URL creation fails", async () => {
  using _setup = setup();
  using _web = stubGlobal("desktopBridge", undefined);
  const tab = webTab();
  using open = vi.spyOn(window, "open").mockReturnValue(tab as never);
  state.createUrl.mockResolvedValue(
    AsyncResult.failure(Cause.fail(new Error("File no longer exists"))),
  );
  await using _screen = await renderHarness();
  const result = actions().activate("report.html", "external");
  expect(open).toHaveBeenCalledWith("about:blank", "_blank");
  await result;
  expect(tab.opener).toBeNull();
  expect(tab.close).toHaveBeenCalled();
  expect(tab.location.replace).not.toHaveBeenCalled();
  expect(state.toast).toHaveBeenCalledWith(
    expect.objectContaining({ type: "error", description: "File no longer exists" }),
  );
});

it("reports blocked popups without minting an asset URL", async () => {
  using _setup = setup();
  using _web = stubGlobal("desktopBridge", undefined);
  using _open = vi.spyOn(window, "open").mockReturnValue(null);
  await using _screen = await renderHarness();
  await actions().activate("report.html", "external");
  expect(state.createUrl).not.toHaveBeenCalled();
  expect(state.toast).toHaveBeenCalledWith(
    expect.objectContaining({ description: expect.stringContaining("Allow pop-ups") }),
  );
});

it("closes a reserved tab when signing rejects", async () => {
  using _setup = setup();
  using _web = stubGlobal("desktopBridge", undefined);
  const tab = webTab();
  using _open = vi.spyOn(window, "open").mockReturnValue(tab as never);
  state.createUrl.mockRejectedValue(new Error("Disconnected"));
  await using _screen = await renderHarness();
  await actions().activate("report.html", "external");
  expect(tab.close).toHaveBeenCalledOnce();
  expect(tab.location.replace).not.toHaveBeenCalled();
});

it("does not navigate a tab the user closed while signing", async () => {
  using _setup = setup();
  using _web = stubGlobal("desktopBridge", undefined);
  const tab = webTab(true);
  using _open = vi.spyOn(window, "open").mockReturnValue(tab as never);
  await using _screen = await renderHarness();
  await actions().activate("report.html", "external");
  expect(tab.location.replace).not.toHaveBeenCalled();
});
