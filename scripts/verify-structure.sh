#!/usr/bin/env bash
set -e
cd /home/z/my-project
FAIL=0
while IFS= read -r filepath; do
  [[ -z "$filepath" ]] && continue
  if [ -f "$filepath" ]; then
    printf "  ✓ %s\n" "$filepath"
  else
    printf "  ✗ %s MISSING!\n" "$filepath"
    FAIL=$((FAIL + 1))
  fi
done < .cirkle-structure
if [ "$FAIL" -eq 0 ]; then
  echo "✅ ALL FILES PRESENT"
else
  echo "❌ $FAIL FILE(S) MISSING"
fi
bun run lint 2>&1 | tail -1
curl -s -o /dev/null -w "Dev: HTTP %{http_code}\n" http://127.0.0.1:3000/
