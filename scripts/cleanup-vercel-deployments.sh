#!/bin/bash
# ── Vercel Deployment Cleanup Script ────────────────────────────────────────
#
# Keeps only the latest production deployment and deletes all older ones.
#
# Usage:
#   VERCEL_TOKEN=your_token_here bash scripts/cleanup-vercel-deployments.sh
#
# Get your token from: https://vercel.com/account/tokens
# ────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────────────
PROJECT_ID="prj_JGfc6hW2CsP4BWjxKysoWa4RDvZ5"
TEAM_ID="team_bVAdJfvsNGW6Os3KxkhvHoq8"
TOKEN="${VERCEL_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ ERROR: VERCEL_TOKEN environment variable is required."
  echo "   Get your token from: https://vercel.com/account/tokens"
  echo "   Then run: VERCEL_TOKEN=your_token bash scripts/cleanup-vercel-deployments.sh"
  exit 1
fi

echo "🧹 Vercel Deployment Cleanup"
echo "   Project: $PROJECT_ID"
echo "   Team:    $TEAM_ID"
echo ""

# ── Fetch all deployments ──────────────────────────────────────────────────
echo "📋 Fetching deployments..."
DEPLOYMENTS=$(curl -s \
  "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&teamId=$TEAM_ID&limit=100" \
  -H "Authorization: Bearer $TOKEN" \
  2>&1)

# Count deployments
TOTAL=$(echo "$DEPLOYMENTS" | python3 -c "
import sys, json
d = json.load(sys.stdin)
deployments = d.get('deployments', [])
print(len(deployments))
" 2>/dev/null || echo "0")

echo "   Found: $TOTAL deployments"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "✅ No deployments to clean up."
  exit 0
fi

# ── Delete all except the latest production deployment ─────────────────────
echo "🗑️  Deleting old deployments (keeping latest production)..."

echo "$DEPLOYMENTS" | python3 -c "
import sys, json, subprocess

d = json.load(sys.stdin)
deployments = d.get('deployments', [])

# Sort by created time (newest first)
deployments.sort(key=lambda x: x.get('createdAt', 0), reverse=True)

# Find the latest production deployment
latest_prod = None
for dep in deployments:
    if dep.get('target') == 'production':
        latest_prod = dep
        break

if latest_prod:
    print(f'✅ Keeping: {latest_prod[\"uid\"]} (production, {latest_prod.get(\"url\", \"?\")})')
else:
    print('⚠️  No production deployment found — keeping the latest deployment')
    if deployments:
        latest_prod = deployments[0]
        print(f'✅ Keeping: {latest_prod[\"uid\"]} (latest)')

# Delete all others
deleted = 0
for dep in deployments:
    if dep.get('uid') == latest_prod.get('uid'):
        continue
    uid = dep.get('uid', '')
    url = dep.get('url', '?')
    target = dep.get('target', 'preview')
    
    # Delete via API
    import urllib.request
    req = urllib.request.Request(
        f'https://api.vercel.com/v13/deployments/{uid}?teamId=$TEAM_ID',
        method='DELETE',
        headers={'Authorization': 'Bearer $TOKEN'}
    )
    try:
        resp = urllib.request.urlopen(req)
        print(f'  🗑️  Deleted: {uid} ({target}, {url})')
        deleted += 1
    except Exception as e:
        print(f'  ❌ Failed: {uid} ({target}, {url}) — {e}')

print(f'')
print(f'✅ Cleanup complete: kept 1, deleted {deleted}')
" 2>/dev/null

echo ""
echo "📝 Note: Vercel keeps deployment records even after deletion."
echo "   To fully remove, visit: https://vercel.com/mohamed-eltonsys-projects/cirkle/deployments"
