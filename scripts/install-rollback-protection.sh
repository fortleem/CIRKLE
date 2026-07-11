#!/usr/bin/env bash
# Installs (or refreshes) the rollback-protection git hooks for Cirkle.
# Safe to run repeatedly — idempotent.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

HOOK_DIR=".git/hooks"
PRE_PUSH="$HOOK_DIR/pre-push"

mkdir -p "$HOOK_DIR"

cat > "$PRE_PUSH" <<'HOOK'
#!/usr/bin/env bash
# pre-push guard — permanent rollback protection for Cirkle (دواير)
set -u
PROTECTED_BRANCHES="^refs/heads/(main|master)$"
PROTECTED_TAGS="^refs/tags/(v-.*|cirkle-.*|backup/.*)$"
while read -r local_ref local_sha remote_ref remote_sha; do
  if [[ "$remote_ref" =~ $PROTECTED_BRANCHES ]]; then
    if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
      echo "❌ BLOCKED: deleting protected branch '$remote_ref' is not allowed." >&2
      exit 1
    fi
    if [ "$remote_sha" != "0000000000000000000000000000000000000000" ]; then
      if ! git merge-base --is-ancestor "$remote_sha" "$local_sha"; then
        echo "❌ BLOCKED: non-fast-forward push to protected branch '$remote_ref'." >&2
        echo "   This would rewrite published history. Bypass with: git push --no-verify (NOT RECOMMENDED)." >&2
        exit 1
      fi
    fi
  fi
  if [[ "$remote_ref" =~ $PROTECTED_TAGS ]]; then
    if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
      echo "❌ BLOCKED: deleting protective tag '$remote_ref' is not allowed." >&2
      exit 1
    fi
  fi
done
echo "✓ pre-push guard: all checks passed"
exit 0
HOOK
chmod +x "$PRE_PUSH"

# Neutralize destructive hooks (idempotent)
for h in post-checkout post-merge post-reset; do
  echo "# Disabled — was causing auto-resets that destroyed newer code" > "$HOOK_DIR/$h"
  chmod +x "$HOOK_DIR/$h"
done

echo "✓ pre-push guard installed at $PRE_PUSH"
echo "✓ post-checkout / post-merge / post-reset neutralized"
echo ""
echo "Protective tags currently defined:"
git tag -l 'v-*' 'cirkle-*' 'backup/*' | sed 's/^/  - /'
