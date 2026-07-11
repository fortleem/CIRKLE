#!/usr/bin/env bash
cd /home/z/my-project
echo "🔍 Overlay audit"
echo "1) Orphan overlays:"
for f in src/components/overlays/*.tsx; do
  base=$(basename "$f" .tsx)
  hits=$(rg -l "@/components/overlays/$base\"" src/ 2>/dev/null | grep -v "^$f$" | wc -l)
  [ "$hits" -eq 0 ] && echo "  ✗ ORPHAN $base" || true
done
echo "  (none = all imported)"
echo "2) Duplicate processes:"
echo "  next-server: $(pgrep -fc next-server 2>/dev/null || echo 0)"
echo "  bun --hot: $(pgrep -fc 'bun --hot' 2>/dev/null || echo 0)"
echo "3) File counts:"
echo "  src/ files: $(find src -name '*.ts' -o -name '*.tsx' | wc -l)"
echo "  Overlays: $(ls src/components/overlays/*.tsx | wc -l)"
echo "  API routes: $(find src/app/api -name 'route.ts' | wc -l)"
