#!/usr/bin/env bash
# Circle Platform — Restore Script
# Restores the platform structure from the git backup commit.
# Usage: bash scripts/restore-platform.sh [commit-hash]

set -e

echo "🔄 Circle Platform Restore Script"
echo "=================================="

cd /home/z/my-project

if [ ! -f package.json ]; then
  echo "❌ Error: Not in the project root (no package.json found)"
  exit 1
fi

COMMIT=${1:-HEAD}
echo "🔧 Restoring source files from: $COMMIT"

git checkout "$COMMIT" -- src/ 2>/dev/null || {
  echo "❌ Failed to restore src/ — commit may not exist"
  exit 1
}
git checkout "$COMMIT" -- public/mock/ 2>/dev/null || echo "⚠️  public/mock/ not in commit"
git checkout "$COMMIT" -- .env 2>/dev/null || true

echo ""
echo "✅ Restore complete! Key files restored:"
echo "  - src/app/ (page.tsx, layout.tsx, globals.css, api/*)"
echo "  - src/lib/ (app-store, mock, i18n, tabs, countries, ai)"
echo "  - src/screens/ (8 screens)"
echo "  - src/components/ (overlays/, shell/, brand/, splash, onboarding)"
echo "  - public/mock/ (scene + avatar images)"
echo ""
echo "Next: bun run lint && verify dev server (port 3000)"
