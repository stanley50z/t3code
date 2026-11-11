# Muse Code

Run [Muse Code](https://dev.meta.ai/docs/muse-code) on your T3 Code server. Muse Code is disabled by default.

## Set up Muse Code

1. Install Muse Code on the server machine and run `muse login` as the user running T3 Code.
2. Open **Settings → Providers**, select the environment, enable **Muse Code** (set **Binary path** if not on `PATH`), and refresh provider status.

> Note: Provider status shows when Muse is signed out. Run `muse login` on the host, then refresh its status.

- **API key**: T3 Code ignores inherited server `META_API_KEY`. To bill an instance via API key instead of `muse login`, add `META_API_KEY` in that instance's **Environment** settings (overrides the saved login).
- **Multiple instances**: Instances on the same host share `muse login` unless given their own `META_API_KEY`.
- **Updates**: In-app updates work when T3 Code recognizes the Muse launcher; otherwise update Muse on the host manually.

## Models, permissions, and limitations

- **Models**: Reported by Muse on the host (refresh provider status after config changes). If a listed model fails with an access error, pick another or add an allowed ID under **Custom models**.
- **Permission modes**: Supports **Supervised** and **Full access** only (**Auto** and **Auto-accept edits** are unavailable).
- **Skills**: Muse skills appear in the composer's `$` menu (manage them with `muse skills` on the host; changes can take up to five minutes to show, see [Commands and skills](./composer.md#commands-and-skills)). A picked skill is sent to Muse as text, so Muse loads it only if the model may invoke that skill.
- **Forks & rewind**: Forking starts a new session with copied conversation context; conversation rewind is not supported.
- **T3 tools**: Muse can use T3 Code's MCP tools when reachable (turns continue without them if unavailable).

## Usage limits

**Usage → Limits** shows your Meta subscription's session and weekly windows. T3 Code checks them when provider status refreshes, without sending a model message, on Muse 1.4.13 or newer (`muse usage --json`); replies also update them.

- A failed refresh shows a provider warning and keeps the last reported limits. If Meta has not reported an allowance yet, or Muse is older, limits appear after Muse's next reply.
- The same Meta account on several hosts counts once when Muse reports the same email address; connections that report only a display label count separately.
- With an API key, Limits shows none: a key names no Meta account to count them against.
