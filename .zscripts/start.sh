#!/bin/sh

# ═══════════════════════════════════════════════════════════════
# Cirkle — Production start (UNIVERSAL)
# ═══════════════════════════════════════════════════════════════
# Tries multiple ports and runtimes to guarantee the app starts.
# Logs everything to /tmp/cirkle-start.log for debugging.
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="/tmp/cirkle-start.log"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== Cirkle start.sh BEGIN ==="
log "SCRIPT_DIR=$SCRIPT_DIR"
log "User=$(whoami) PID=$$"
log "bun=$(command -v bun 2>/dev/null || echo NO)"
log "node=$(command -v node 2>/dev/null || echo NO)"
log "python3=$(command -v python3 2>/dev/null || echo NO)"
log "FC_CUSTOM_LISTEN_PORT=${FC_CUSTOM_LISTEN_PORT:-unset}"
log "PORT=${PORT:-unset}"
log "Files: $(ls "$SCRIPT_DIR" 2>/dev/null | tr '\n' ' ')"

# Environment
export NODE_ENV=production
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:$SCRIPT_DIR/db/custom.db"
export GROQ_API_KEY="${GROQ_API_KEY:-}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"
export HUGGINGFACE_API_KEY="${HUGGINGFACE_API_KEY:-}"
export WEBZ_IO_API_KEY="${WEBZ_IO_API_KEY:-}"

# Mini-services (background, non-fatal)
if [ -f "$SCRIPT_DIR/mini-services-start.sh" ]; then
    sh "$SCRIPT_DIR/mini-services-start.sh" >> "$LOG" 2>&1 &
fi

# Find runtime
RUNTIME=""
if command -v bun >/dev/null 2>&1; then
    RUNTIME="bun"
elif command -v node >/dev/null 2>&1; then
    RUNTIME="node"
fi

if [ -z "$RUNTIME" ] || [ ! -f "$SCRIPT_DIR/next-service-dist/server.js" ]; then
    log "FATAL: no runtime or no server.js"
    log "runtime=$RUNTIME server.js=$([ -f "$SCRIPT_DIR/next-service-dist/server.js" ] && echo yes || echo no)"
    # Last resort: Python HTTP server on :81 serving diagnostic
    if command -v python3 >/dev/null 2>&1; then
        log "Starting Python diagnostic server on :81"
        python3 -c "
import http.server
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('content-type','text/plain')
        self.end_headers()
        self.wfile.write(b'Cirkle: no bun/node found. Check /tmp/cirkle-start.log')
    def do_POST(self): self.do_GET()
    def do_PUT(self): self.do_GET()
    def do_DELETE(self): self.do_GET()
    def log_message(self,*a): pass
http.server.HTTPServer(('0.0.0.0',81),H).serve_forever()
"
    fi
    sleep infinity
fi

cd "$SCRIPT_DIR/next-service-dist" || { log "Cannot cd to next-service-dist"; sleep infinity; }

# Try port 3000 first (platform Caddy proxies :81 → :3000)
log "Trying port 3000..."
export PORT=3000
$RUNTIME server.js >> "$LOG" 2>&1 &
PID3000=$!
sleep 3

if kill -0 "$PID3000" 2>/dev/null; then
    log "Next.js started on :3000 (PID: $PID3000)"
    # Check if port 81 also needs serving
    # Try Caddy on :81
    if command -v caddy >/dev/null 2>&1 && [ -f "$SCRIPT_DIR/Caddyfile" ]; then
        cd "$SCRIPT_DIR"
        caddy run --config Caddyfile --adapter caddyfile >> "$LOG" 2>&1 &
        CADDY_PID=$!
        sleep 2
        if kill -0 "$CADDY_PID" 2>/dev/null; then
            log "Caddy on :81 → :3000 (PID: $CADDY_PID)"
            wait "$CADDY_PID"
            log "Caddy exited"
        fi
        cd "$SCRIPT_DIR/next-service-dist"
    fi
    # If Caddy failed/exited, keep Next.js running as main process
    log "Next.js :3000 is main process now"
    wait "$PID3000"
    log "Next.js :3000 exited"
fi

# Port 3000 failed — try port 81 directly
log "Trying port 81..."
kill "$PID3000" 2>/dev/null
export PORT=81
cd "$SCRIPT_DIR/next-service-dist"
exec $RUNTIME server.js
