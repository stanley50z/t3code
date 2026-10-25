# stanley50z/t3code fork

`sz/main` is upstream `pingdotgg/t3code` `main` plus a short series of patch commits. Fork `main` mirrors upstream.

## Patch policy

- A wanted feature that upstream already has as a PR is pulled in as one squashed commit with a `Fork-Upstream-PR: <number>` trailer. When upstream merges that PR, the commit is dropped.
- A feature with no upstream PR is implemented here, with a `Fork-Tracking:` trailer naming the related upstream issues or discussions.
- Every patch commit has a `Fork-Verify:` trailer listing the tests that check it.

`git log --format='%h %s%n%(trailers)' upstream/main..sz/main` lists the patches.

## Sync

A weekly T3 scheduled task (Tuesdays) rebuilds `sz/main` on the latest upstream `main`. It drops patches whose PRs merged, refreshes pulled PRs that gained commits, reports new upstream work related to our own patches, and runs each patch's `Fork-Verify` tests before force-pushing.

## Desktop build (Windows)

```sh
export PATH="$HOME/AppData/Local/vite-plus/bin:$HOME/.cargo/bin:$PATH"
set -a; . ./.env.desktop-build; set +a   # gitignored public T3 Connect config
T3CODE_DESKTOP_VERSION=<nightly version> vp run dist:desktop:win:x64
```

The installer lands in `release/`. It ships no update feed, so the installed app never replaces itself with upstream. Quit T3 Code before running it.
