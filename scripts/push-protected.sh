#!/usr/bin/env bash
# Pushes local main + all protective tags to origin, after verifying the
# pre-push guard is installed. Aborts on non-fast-forward (the hook would
# block it anyway, but we check first for a cleaner error).

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ ! -x .git/hooks/pre-push ]; then
  echo "❌ pre-push guard not installed. Run: bash scripts/install-rollback-protection.sh" >&2
  exit 1
fi

# Verify fast-forward is possible
if ! git merge-base --is-ancestor origin/main main 2>/dev/null; then
  echo "❌ origin/main is NOT an ancestor of local main — push would be rejected." >&2
  echo "   Resolve divergence (rebase or merge) before pushing." >&2
  exit 1
fi

echo "→ Pushing main to origin (fast-forward)..."
git push origin main

echo "→ Pushing protective tags (v-*, cirkle-*, backup/*)..."
git push origin --tags 'refs/tags/v-*:refs/tags/v-*' 'refs/tags/cirkle-*:refs/tags/cirkle-*' 'refs/tags/backup/*:refs/tags/backup/*' 2>/dev/null || \
  git push origin --tags

echo ""
echo "✓ Done. Remote state:"
echo "  origin/main: $(git rev-parse --short origin/main)"
echo "  Protective tags on remote:"
git ls-remote --tags origin 'v-*' 'cirkle-*' 'backup/*' | awk '{print "    " $2}' | sed 's|refs/tags/||'
