# CIRKLE (دوائر) — Rollback Protection

This document describes the **permanent safeguards** that prevent the CIRKLE codebase from being rolled back to older, broken versions.

> **Production-stable release — 2026-08-12**
> Tag `production-stable-2026-08-12` marks the current production state: 97 Prisma tables, 71 overlays, 17 locale packs, Brain AI 9+1 phases with AIKE Phase 7.5, 135 data sources, 10 creative social features. All endpoints verified healthy.

## TL;DR — What is protected

| Asset | Protection |
|---|---|
| Branch `main` (GitHub) | **GitHub Branch Protection API**: `allow_force_pushes=false`, `allow_deletions=false`, `required_linear_history=true`, `enforce_admins=true`, `required_status_checks=strict`. Verified via API on 2026-08-12. |
| Branch `main` (local) | Pre-push hook (`.git/hooks/pre-push`, mode 555 read-only) blocks force-push and non-fast-forward updates |
| Tag `production-stable-2026-08-12` | Pre-push hook blocks deletion (matches `production-*` pattern). Also protected server-side by GitHub branch protection rules. |
| All `v-*`, `cirkle-*`, `backup/*`, `production-*` tags | Pre-push hook blocks deletion |
| Git config | `receive.denyNonFastForwards=true`, `receive.denyDeletes=true`, `transfer.fsckObjects=true` |
| `.env` | Filesystem read-only (`chmod 444`); validated at boot by `src/lib/env-validation.ts` |
| Fresh backup | `backups/cirkle-production-20260812-153447.tar.gz` (full working-tree tar.gz, 393 MB) |
| CI workflow | `.github/workflows/ci.yml` — runs on every push and PR |
| Vercel deployment | Auto-deploys on every push to `main`. Project ID: `prj_JGfc6hW2CsP4BWjxKysoWa4RDvZ5`. |
| Turso database | Edge-replicated libSQL at `cirkle-fortleem.turso.io`, 97 tables. Schema in `prisma/schema.prisma`. |

## 0. Current production state (verified 2026-08-12)

```
HEAD commit:           763e03c — "feat: 10 creative social media features"
Branch:                main
Protective tag:        production-stable-2026-08-12 (points at HEAD)
Locale packs:          17 (ar, ar-formal, en, fr, es, tr, ur, hi, zh, ja, it, de, ru, pt, id, ko, fa)
Overlays:              71
API routes:            233
Prisma models:         97
AIKE modules:          22 core + 15 domain trainers
Data sources:          135 across 22 categories
Docs:                  12 (3 ADRs, blueprint v15, compliance matrix, etc.)
Backups:               2 (20260812-132736 = 147 MB, 20260812-153447 = 393 MB)
Lint:                  0 errors, 0 warnings
Dev server:            http://localhost:3000 — all endpoints healthy
```

## 1. GitHub branch protection (server-side, enforced by GitHub)

Set up via the GitHub REST API on 2026-08-12. Affects ALL collaborators, including admins (`enforce_admins=true`).

```json
{
  "required_status_checks": { "strict": true, "contexts": [] },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false
}
```

What this prevents:
- **Force-push to main** → rejected by GitHub (`allow_force_pushes=false`). This is the primary anti-rollback mechanism — nobody can rewrite published history.
- **Branch deletion** → rejected by GitHub (`allow_deletions=false`).
- **Merge commits** → rejected by GitHub (`required_linear_history=true`). Only fast-forward or rebase-merges are allowed.
- **Direct pushes that skip required checks** → blocked once CI contexts are added.

To verify the protection is still active:
```bash
gh api repos/fortleem/CIRKLE/branches/main/protection
# or, without gh:
node /tmp/verify-protection.mjs   # script in this repo's dev tools
```

## 2. Pre-push guard hook (client-side, defense in depth)

Location: `.git/hooks/pre-push` (mode 555 — read + execute, no write).

Behavior:
- **Blocks** force-push (`+refspec`) and non-fast-forward updates to `refs/heads/main` or `refs/heads/master`.
- **Blocks** deletion of any tag matching `v-*`, `cirkle-*`, `backup/*`, or `production-*`.
- **Allows** legitimate fast-forward pushes and creation of new tags.
- Emergency bypass: `git push --no-verify` (documented but discouraged; will still be blocked by GitHub's server-side protection).

The hook file is mode `555` (read + execute only, no write) so it cannot be accidentally edited. To modify it, you must explicitly `chmod u+w` first.

## 3. Disabled destructive hooks

The following hooks previously auto-ran `scripts/master-restore.sh` on every checkout/merge/reset, which silently rewrote the working tree to an ancient baseline and wiped newer code:

- `.git/hooks/post-checkout`
- `.git/hooks/post-merge`
- `.git/hooks/post-reset`

Each now contains only a comment marking it as disabled. `scripts/master-restore.sh` itself is neutralized — it prints a warning and exits 0 without doing anything. **Do NOT re-enable any of these without explicit CTO approval.**

## 4. Git config hardening

```ini
[receive]
    denyNonFastForwards = true   # server-side: reject history rewrites
    denyDeletes = true           # server-side: reject branch/tag deletion
[transfer]
    fsckObjects = true           # verify object integrity on transfer
```

These make any future non-fast-forward push or ref deletion fail at the git protocol layer, independent of the pre-push hook or the GitHub API.

## 5. Protective tags

| Tag | Points at | Meaning |
|---|---|---|
| `production-stable-2026-08-12` | `763e03c` | The current production-stable release. All endpoints verified healthy, all features verified working. This is the recovery point if anything goes wrong. |

To list all protective tags:
```bash
git tag -l 'v-*' 'cirkle-*' 'backup/*' 'production-*'
```

To create a new production-stable tag (after verifying a release):
```bash
git tag -a production-stable-YYYY-MM-DD -m "Production-stable release: <summary>"
git push cirkle production-stable-YYYY-MM-DD
```

## 6. Backups

Location: `backups/` directory (gitignored).

Current backups:
```
backups/cirkle-production-20260812-132736.tar.gz   (147 MB — code only)
backups/cirkle-production-20260812-153447.tar.gz   (393 MB — full project incl. screenshots)
```

Restore from the latest backup:
```bash
mkdir cirkle-restored && tar -xzf backups/cirkle-production-20260812-153447.tar.gz -C cirkle-restored
cd cirkle-restored && bun install && bun run db:push && bun run dev
```

Old backups should be rotated out periodically — keep at most the 3 most recent. Do NOT recreate old-format `.bundle` backups — they would reintroduce rollback targets.

## 7. Remotes & deployment

Single remote configured (token redacted in display):

- `cirkle` → `github.com/fortleem/CIRKLE.git`

Push flow:
```bash
git push cirkle main                    # fast-forward push (the only kind allowed)
git push cirkle <new-tag>               # create a new protective tag
```

Vercel auto-deploys on every push to `main`. Project ID: `prj_JGfc6hW2CsP4BWjxKysoWa4RDvZ5`. The deployment URL is shown in the Vercel dashboard.

Turso database is at `cirkle-fortleem.turso.io`. Schema is in `prisma/schema.prisma` and pushed via `bun run db:push`. The Turso auth token is in `.env` (read-only, chmod 444).

## 8. Recovery procedure (if rollback somehow occurs)

Because history rewriting is blocked at three layers (local hook + git config + GitHub API), the only realistic "rollback" is accidentally deleting files from the working tree. To recover:

1. **Do NOT commit anything** — preserve uncommitted work first.
2. Restore from the production-stable tag:
   ```bash
   git reset --hard production-stable-2026-08-12
   ```
   Or, if `.git` itself is corrupted, restore from the tar.gz backup:
   ```bash
   tar -xzf backups/cirkle-production-20260812-153447.tar.gz -C /path/to/fresh/clone
   ```
3. Verify with `bun run lint` and `curl http://localhost:3000/api/health`.
4. Open the app in the browser to confirm runtime health.
5. If the tag itself was somehow deleted from the remote, re-create it from the local tag (the local tag is protected by the pre-push hook):
   ```bash
   git push cirkle production-stable-2026-08-12
   ```

## 9. Audit commands

Quick health check:
```bash
# Git hygiene
echo "Commits:              $(git rev-list --all --count)"
echo "Branches:             $(git branch | wc -l)"
echo "Tags:                 $(git tag | wc -l)"
echo "Protective tags:      $(git tag -l 'v-*' 'cirkle-*' 'backup/*' 'production-*' | wc -l)"

# GitHub branch protection (requires gh or node + token)
node /tmp/verify-protection.mjs

# App health
curl -s http://localhost:3000/api/health | jq .
curl -s http://localhost:3000/api/aike/status | jq .
curl -s http://localhost:3000/api/brain/status | jq .

# Turso health
curl -s -X POST "https://cirkle-fortleem.turso.io/v2/pipeline" \
  -H "Authorization: Bearer $TURSO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"requests":[{"type":"execute","stmt":{"sql":"SELECT count(*) FROM sqlite_master WHERE type='\''table'\''"}}]}'
```

## 10. Why this matters

CIRKLE has been through multiple major iterations (v12 → v14 → v15 → production-stable-2026-08-12). At each step, older versions contained broken code, missing features, or architecture decisions that were superseded. By:

1. **Wiping all old history** (done in v14.0 — single-squash baseline)
2. **Blocking history rewrites** at 3 layers (local hook + git config + GitHub API)
3. **Tagging every verified production state** (`production-stable-*`)
4. **Keeping fresh tar.gz backups** of the working tree

…we guarantee that the codebase can only move **forward**. There is no path back to a known-broken state.
