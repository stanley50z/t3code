# stanley50z/t3code fork

`sz/main` is upstream `pingdotgg/t3code` `main` plus a short series of patch commits. Fork `main` mirrors upstream.

## Patch policy

- When the user proposes a feature or bug fix, first search upstream `pingdotgg/t3code` issues and PRs, open and closed, and report what you find before writing code. The results decide which rule below applies.
- If the corresponding fix is already merged upstream, fetch and rebase `sz/main` onto the newest `upstream/main`, preserving unrelated fork changes and dropping duplicate patches. Use the merged fix through that rebase instead of implementing or cherry-picking it separately.
- A wanted feature available in an unmerged upstream PR is pulled in as one squashed commit with a `Fork-Upstream-PR: <number>` trailer. When upstream merges that PR, drop the patch during the rebase.
- A feature with no upstream PR is implemented here, with a `Fork-Tracking:` trailer naming the related upstream issues or discussions.
- Every patch commit has a `Fork-Verify:` trailer listing the tests that check it.

`git log --format='%h %s%n%(trailers)' upstream/main..sz/main` lists the patches.

## Sync

Every change to `sz/main` (a rebase, a new or refreshed patch, any fork commit) must finish with the branch pushed to `origin` and a fresh Windows installer built from that source, with a clickable installer link in the final reply. Do it right away without asking. Verify the artifact exists before linking it; a source-only change is incomplete. Installing it stays manual.

A T3 scheduled task (Monday, Wednesday and Friday at 05:00) rebuilds `sz/main` on the latest upstream `main`. It drops patches whose PRs merged, refreshes pulled PRs that gained commits, reports new upstream work related to our own patches, and runs each patch's `Fork-Verify` tests before force-pushing. It then builds the Windows installer as below, logging to `release/desktop-build.log`; installing it stays manual.

## Desktop build (Windows)

```sh
export PATH="$HOME/AppData/Local/vite-plus/bin:$HOME/.cargo/bin:$PATH"
set -a; . ./.env.desktop-build; set +a   # gitignored public T3 Connect config
export T3CODE_DESKTOP_VERSION=$(gh release list -R pingdotgg/t3code --limit 30 --exclude-drafts --json tagName -q '[.[].tagName | select(contains("-nightly."))][0] | ltrimstr("v")')
vp run dist:desktop:win:x64
```

Always build with the newest published upstream nightly release version, never a hand-picked one. The version picks the product name, so a stable or preview build installs `T3 Code (Beta).exe` beside the nightly's `T3 Code (Nightly).exe`; switching channels makes the installer drop the old shortcuts and breaks the user's taskbar pin. Over SSH the app installs the upstream runtime archive named by its own version on the remote host (`~/.t3/runtime/versions/<version>`), so an unpublished version fails with a curl 404 and remote hosts only ever run genuine upstream runtimes.

The installer lands in `release/`. It ships no update feed, so the installed app never replaces itself with upstream. Quit T3 Code before running it.
