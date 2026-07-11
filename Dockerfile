# ═══════════════════════════════════════════════════════════════
# Cirkle — Production Dockerfile
# ═══════════════════════════════════════════════════════════════
# Single-stage: uses pre-built standalone output from .zscripts/build.sh
# Runs Next.js DIRECTLY on port 81 (the platform's expected port).
# ═══════════════════════════════════════════════════════════════

FROM oven/bun:1

WORKDIR /app

# Copy the pre-built standalone output (from .next/standalone)
COPY next-service-dist/ ./

# Copy static assets and public
COPY next-service-dist/.next/static ./.next/static
COPY next-service-dist/public ./public

# Copy database
COPY db/ ./db/

# Set environment variables
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=81
ENV DATABASE_URL="file:/app/db/custom.db"
ENV GROQ_API_KEY=""
ENV OPENAI_API_KEY=""
ENV HUGGINGFACE_API_KEY=""
ENV NEXT_TELEMETRY_DISABLED=1

# Health check on port 81 (the platform's expected port)
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://localhost:81/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" || exit 1

EXPOSE 81

# Run Next.js directly on port 81
CMD ["bun", "server.js"]
