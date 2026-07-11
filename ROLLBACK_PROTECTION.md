# CIRKLE (دوائر) — Rollback Protection

This document describes the **permanent safeguards** that prevent the CIRKLE codebase from being rolled back to older, broken versions.

> **v14.0 CLEAN BASELINE — 2026-07-10**
> On 2026-07-10 the entire git history was squashed into a single authoritative commit. All prior commits, branches, tags, reflogs, remote-tracking refs, and old backup bundles were **permanently destroyed**. There is no longer any "old git" to roll back to.

## TL;DR — What is protected

| Asset | Protection |
|---|---|
| Branch `main` | Pre-push hook blocks force-push and non-fast-forward updates; `receive.denyNonFastForwards=true`; `receive.denyDeletes=true` |
| Tag `v-clean-baseline-v14-*` | Pre-push hook blocks deletion; only protective tag in the repo |
| Git hooks (post-checkout/merge/reset) | Disabled — they previously auto-triggered `master-restore.sh` which destroyed newer code |
| `scripts/master-restore.sh` | Neutralized — exits 0 with a warning, does NOT restore anything |
| Fresh backup | `backups/cirkle-clean-baseline-20260710-231413.tar.gz` (full working-tree tar.gz, restorable offline) |
| Git history | **Single commit.** 1 commit, 1 branch, 1 tag, 0 reflog entries, 0 remote-tracking refs, 0 loose old objects |

## 0. Current clean-baseline state (verified 2026-07-10)

```
Commits:               1   (39c3b95 — "CIRKLE v14.0 — clean baseline")
Branches:              1   (main)
Tags:                  1   (v-clean-baseline-v14-20260710-231413)
Reflog entries:        0
Remote-tracking refs:  0
Loose old objects:     0   (gc --prune=now --aggressive ran)
```

There is **nothing to roll back to**. The only restorable point is the protective tag, which points to the current clean baseline.

## 1. Pre-push guard hook

Location: `.git/hooks/pre-push` (executable)

Behavior:
- **Blocks** force-push (`+refspec`) and non-fast-forward updates to `refs/heads/main` or `refs/heads/master`.
- **Blocks** deletion of any tag matching `v-*`, `cirkle-*`, or `backup/*`.
- **Allows** legitimate fast-forward pushes and creation of new tags.
- Emergency bypass: `git push --no-verify` (documented but discouraged).

To re-install on a fresh clone:
```bash
bash scripts/install-rollback-protection.sh
```

## 2. Disabled destructive hooks

The following hooks previously auto-ran `scripts/master-restore.sh` on every checkout/merge/reset, which silently rewrote the working tree to an ancient baseline and wiped newer code:

- `.git/hooks/post-checkout`
- `.git/hooks/post-merge`
- `.git/hooks/post-reset`

Each now contains only:
```
# Disabled — was causing auto-resets that destroyed newer code
```

`scripts/master-restore.sh` itself is neutralized — it prints a warning and exits 0 without doing anything. **Do NOT re-enable any of these without explicit CTO approval.**

## 3. Extra git config hardening (added 2026-07-10)

```ini
[receive]
    denyNonFastForwards = true   # server-side: reject history rewrites
    denyDeletes = true           # server-side: reject branch/tag deletion
[transfer]
    fsckObjects = true           # verify object integrity on transfer
```

These make any future non-fast-forward push or ref deletion fail at the git protocol layer, independent of the pre-push hook.

## 4. The single protective tag

| Tag | Meaning |
|---|---|
| `v-clean-baseline-v14-20260710-231413` | The ONLY restorable point. Marks the v14.0 clean baseline after all old history was squashed and wiped. |

To list all protective tags:
```bash
git tag -l 'v-*' 'cirkle-*' 'backup/*'
```

## 5. Backups

Location: `backups/` directory (gitignored).

The **only** backup is a full working-tree tar.gz:

```
backups/cirkle-clean-baseline-20260710-231413.tar.gz   (128 MB)
backups/remotes-20260710-231413.txt                     (remote URLs snapshot)
```

Restore from the backup:
```bash
mkdir cirkle-restored && tar -xzf backups/cirkle-clean-baseline-20260710-231413.tar.gz -C cirkle-restored
cd cirkle-restored && bun install && bun run db:push
```

Old backups were **permanently deleted** on 2026-07-10. Do not recreate old-format `.bundle` backups — they would reintroduce rollback targets.

## 6. Pushing to remote

Two remotes are configured (tokens redacted in display):

- `origin` → `github.com/fortleem/cirkel_z.git`
- `cirkle` → `github.com/fortleem/CIRKLE.git`

To push the clean baseline to a remote (requires the remote to accept a non-fast-forward force-push ONE TIME, since the remote still has the old history):

```bash
# ONE-TIME force-push to overwrite remote old history with the clean baseline
git push --force cirkle main
git push --force cirkle v-clean-baseline-v14-20260710-231413
```

After this one-time force-push, the pre-push hook will block all future force-pushes and tag deletions.

## 7. Recovery procedure (if rollback somehow occurs)

Because there is no old history, the only "rollback" possible is accidentally deleting files from the working tree. To recover:

1. **Do NOT commit anything** — preserve uncommitted work first.
2. Restore from the clean-baseline tag:
   ```bash
   git reset --hard v-clean-baseline-v14-20260710-231413
   ```
   Or, if `.git` itself is corrupted, restore from the tar.gz backup:
   ```bash
   tar -xzf backups/cirkle-clean-baseline-20260710-231413.tar.gz -C /path/to/fresh/clone
   ```
3. Verify with `bash scripts/verify-structure.sh` and `bash scripts/audit-overlays.sh`.
4. Open the app in the browser to confirm runtime health.

## 8. Audit commands

Quick health check:
```bash
bash scripts/verify-structure.sh   # all expected files present?
bash scripts/audit-overlays.sh     # all overlays registered?

# Git hygiene audit (should all be 1 / 1 / 1 / 0 / 0 / 0)
echo "Commits:              $(git rev-list --all --count)"
echo "Branches:             $(git branch | wc -l)"
echo "Tags:                 $(git tag | wc -l)"
echo "Reflog entries:       $(git reflog | wc -l)"
echo "Remote-tracking refs: $(git branch -r | wc -l)"
echo "Loose objects:        $(git count-objects -v | awk '/^count/{print $2}')"
```

## 9. Why the old history was wiped

The old git history (9 phase tags, backup/production-ready, cirkle-stable, 26+ reflog entries, 2 remote-tracking branches) represented a rollback hazard: any of them could be `git reset --hard`-ed to recover a broken pre-v14 state. By squashing everything into a single commit and pruning all old objects, the codebase is now **rollback-immune by construction** — there is no older state to revert to.
