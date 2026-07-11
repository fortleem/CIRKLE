# CIRKLE Downloads

## 🧠 CIRKLE Brain AI — Standalone Package

**The 9-phase cognitive operating system, extracted for training and development.**

### Downloads

| File | Size | Format |
|---|---|---|
| [`cirkle-brain-ai.tar.gz`](./cirkle-brain-ai.tar.gz) | 381 KB | tar.gz (Linux/macOS) |
| [`cirkle-brain-ai.zip`](./cirkle-brain-ai.zip) | 490 KB | zip (Windows/macOS) |

### What's inside (182 files)

- **9 AI Phase Engines** — GCIE, PMB, CRIE, IRDE, UOB, TEE, LIEE, CIE, TGSE
- **Phase 4.5 Shared Cognitive Foundation** — Context Manager + Capability Registry
- **5 AI Providers** — Groq, OpenRouter (web search), Gemini, OpenAI, HuggingFace (ZAI removed)
- **45+ Registered Capabilities** — payments, travel, news, maps, identity, government, etc.
- **40+ API Routes** — Brain, Cognitive, UOB, TEE, LIEE, CIE, TGSE, PCPF, AHG
- **53 Prisma Models** — Complete database schema
- **3 Mini-Services** — chat (3003), news (3004), ai-realtime (3001)
- **Training Guide** — `docs/TRAINING.md` explains how to train via LIEE
- **Training Script** — `scripts/train-brain.ts` ready to run
- **Blueprint Reference** — `docs/CIRKLE-BLUEPRINT-v14.txt` (full v14.0 spec)

### Quick Start

```bash
# 1. Extract
tar -xzf cirkle-brain-ai.tar.gz
cd cirkle-brain-ai

# 2. Install
bun install    # or npm install

# 3. Configure 5 AI providers
cp .env.example .env
# Edit .env — add GROQ, OPENROUTER, GEMINI, OPENAI, HUGGINGFACE keys

# 4. Set up database
bunx prisma generate && bunx prisma db push

# 5. Seed the Brain
bun run scripts/seed-brain.ts

# 6. Train the Brain
bun run scripts/train-brain.ts

# 7. Start the API
bun run dev    # http://localhost:3000
```

### Key Documentation

- [`README.md`](./cirkle-brain-ai/README.md) — Architecture overview + setup
- [`docs/TRAINING.md`](./cirkle-brain-ai/docs/TRAINING.md) — How to train the Brain (LIEE + on-device fine-tuning)
- [`docs/CIRKLE-BLUEPRINT-v14.txt`](./cirkle-brain-ai/docs/CIRKLE-BLUEPRINT-v14.txt) — Full blueprint

### License

Apache 2.0 — Open source, free forever.
