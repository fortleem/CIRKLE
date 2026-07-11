#!/usr/bin/env bash
# Creates a fresh full-repository backup as a git bundle in backups/.
# Bundle is restorable offline with: git clone <bundle> <dir>
# Old backups are NOT deleted — prune manually if needed.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

STAMP=$(date +%Y%m%d-%H%M%S)
BUNDLE="$BACKUP_DIR/cirkle-$STAMP.bundle"

# Bundle all branches and tags
git bundle create "$BUNDLE" \
  --branches \
  --tags \
  HEAD 2>&1 | sed 's/^/  /'

# Verify the bundle is restorable
if ! git bundle verify "$BUNDLE" >/dev/null 2>&1; then
  echo "❌ Bundle verification failed — backup may be corrupt." >&2
  exit 1
fi

SIZE=$(du -h "$BUNDLE" | cut -f1)
LATEST_COMMIT=$(git rev-parse --short HEAD)

cat > "$BACKUP_DIR/cirkle-$STAMP.meta" <<META
backup_date: $(date -Iseconds)
backup_commit: $(git rev-parse HEAD)
backup_branch: $(git rev-parse --abbrev-ref HEAD)
backup_message: $(git log -1 --pretty=%s)
bundle_size: $SIZE
restorable_via: git clone $BUNDLE cirkle-restored
META

echo ""
echo "✓ Backup created: $BUNDLE ($SIZE, commit $LATEST_COMMIT)"
echo ""
echo "Existing backups (newest first):"
ls -t "$BACKUP_DIR"/cirkle-*.bundle 2>/dev/null | while read -r b; do
  STAMP_PART=$(basename "$b" .bundle | sed 's/cirkle-//')
  SIZE=$(du -h "$b" | cut -f1)
  echo "  $STAMP_PART  ($SIZE)"
done

# Hint to prune old backups
COUNT=$(ls "$BACKUP_DIR"/cirkle-*.bundle 2>/dev/null | wc -l)
if [ "$COUNT" -gt 3 ]; then
  echo ""
  echo "💡 You have $COUNT backups. To keep only the 3 most recent:"
  echo "   ls -t backups/cirkle-*.bundle | tail -n +4 | xargs -r rm"
fi
