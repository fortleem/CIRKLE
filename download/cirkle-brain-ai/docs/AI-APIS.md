# 🤖 CIRKLE Brain AI — Provider API Reference

**Complete reference for the 5 AI provider APIs used by the CIRKLE Brain AI.**

> **ZAI is completely removed.** All web search and AI generation goes through
> these 5 providers. All have free tiers (except OpenAI).

---

## Quick Reference Table

| Provider | Model | Endpoint | Strength | Free Tier | Env Var |
|---|---|---|---|---|---|
| Groq | `llama-3.3-70b-versatile` | `api.groq.com/openai/v1/chat/completions` | Speed, Arabic | ✅ | `GROQ_API_KEY` |
| OpenRouter | `openrouter/auto:online` | `openrouter.ai/api/v1/chat/completions` | **Web search** | ✅ | `OPENROUTER_API_KEY` |
| Gemini | `gemini-1.5-flash` | `generativelanguage.googleapis.com/v1beta/models/` | Vision, grounding | ✅ | `GEMINI_API_KEY` |
| OpenAI | `gpt-4o-mini` | `api.openai.com/v1/chat/completions` | Reasoning | ❌ | `OPENAI_API_KEY` |
| HuggingFace | `mistralai/Mistral-7B-Instruct-v0.3` | `api-inference.huggingface.co/models/` | Free tier | ✅ | `HUGGINGFACE_API_KEY` |

---

## 1. Groq

### Signup
- URL: https://console.groq.com
- Free tier: Generous quota, no credit card required
- API keys: https://console.groq.com/keys

### API Call

```bash
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ],
    "temperature": 0.8,
    "max_tokens": 1500
  }'
```

### Response Shape

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      }
    }
  ]
}
```

### TypeScript Implementation (in `src/lib/ai.ts`)

```typescript
export async function callGroq(sys: string, usr: string, max = 1500): Promise<string | null> {
  const key = process.env.GROQ_API_KEY || process.env.GROQ_API;
  if (!key) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        temperature: 0.8,
        max_tokens: max,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}
```

### Best For
- ⚡ Real-time chat (500ms response)
- 🇸🇦 Arabic text (best Arabic support)
- 💬 Smart replies
- 🔄 Quick fallback

---

## 2. OpenRouter (Web Search)

### Signup
- URL: https://openrouter.ai
- Free tier: Yes, some models are free
- API keys: https://openrouter.ai/keys

### The `:online` Suffix (KEY FEATURE)

OpenRouter supports a `:online` suffix on model names that enables their
built-in web-search plugin. The model sees fresh web results in its context
before generating. This is how the CIRKLE Brain does web search **without ZAI**.

```
Model: openrouter/auto:online
         ↑                ↑
         auto-selects     enables web search
         the best model
```

### API Call

```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "HTTP-Referer: https://cirkle.app" \
  -H "X-Title: CIRKLE Brain AI" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter/auto:online",
    "messages": [
      {"role": "system", "content": "You are a news search engine. Return JSON only."},
      {"role": "user", "content": "Search for breaking news in Saudi Arabia today"}
    ],
    "temperature": 0.7,
    "max_tokens": 2000
  }'
```

### Response Shape (same as OpenAI format)

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "{\"articles\":[{\"title\":\"...\",\"sourceUrl\":\"https://...\"}]}"
      }
    }
  ]
}
```

### TypeScript Implementation

```typescript
export async function callOpenRouter(sys: string, usr: string, max = 1500): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://cirkle.app",
        "X-Title": "CIRKLE Brain AI",
      },
      body: JSON.stringify({
        model: "openrouter/auto:online",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        temperature: 0.7,
        max_tokens: max,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}
```

### Best For
- 🔍 Web search (news, flights, hotels, prices)
- 📰 Real-time data
- 🌐 Live web content
- 📊 Price trends
- 🗞️ Breaking news

### Used By
- `src/lib/cirkle-brain.ts` → `searchNews()`, `searchFlights()`, `searchHotels()`, `predictPrice()`
- `src/lib/ai.ts` → `fetchTrendingTopics()`
- `mini-services/news-service/index.ts` → Tier 1 web search

---

## 3. Gemini

### Signup
- URL: https://aistudio.google.com
- Free tier: Yes
- API keys: https://aistudio.google.com/app/apikey

### API Call (Standard)

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello!"}]}],
    "generationConfig": {"maxOutputTokens": 1500, "temperature": 0.7}
  }'
```

### API Call (with Google Search Grounding)

This is used in the news-service as Tier 2 fallback. The `google_search_retrieval`
tool enables Google Search grounding — the model sees live web results.

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Search for breaking news in Egypt today"}]}],
    "tools": [{"google_search_retrieval": {}}],
    "generationConfig": {"maxOutputTokens": 2000, "temperature": 0.5}
  }'
```

### Response Shape

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          { "text": "Here are the latest news headlines..." }
        ]
      }
    }
  ]
}
```

### TypeScript Implementation

```typescript
export async function callGemini(sys: string, usr: string, max: number): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.Gemini_API_Key;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${sys}\n\n${usr}` }] }],
          generationConfig: { maxOutputTokens: max, temperature: 0.7 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
}
```

### Best For
- 👁️ Vision (image understanding)
- 🧠 Reasoning
- 🌍 Cultural context
- 🔍 Google Search grounding (web search fallback)
- 🌐 Multi-language

---

## 4. OpenAI

### Signup
- URL: https://platform.openai.com
- Free tier: No (paid only)
- API keys: https://platform.openai.com/api-keys

### API Call

```bash
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Plan a 3-day trip to Cairo"}
    ],
    "temperature": 0.8,
    "max_tokens": 1500
  }'
```

### Response Shape (same as Groq format)

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Here's a 3-day itinerary for Cairo..."
      }
    }
  ]
}
```

### TypeScript Implementation

```typescript
export async function callOpenAI(sys: string, usr: string, max = 1500): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        temperature: 0.8,
        max_tokens: max,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.choices?.[0]?.message?.content ?? null;
  } catch { return null; }
}
```

### Best For
- 🧩 Complex reasoning
- 💻 Code generation
- 📋 Multi-step planning
- 🎯 High-accuracy tasks

---

## 5. HuggingFace

### Signup
- URL: https://huggingface.co
- Free tier: Yes (inference API)
- API keys: https://huggingface.co/settings/tokens

### API Call

```bash
curl -X POST https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3 \
  -H "Authorization: Bearer $HUGGINGFACE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": "<s>[INST] You are a helpful assistant.\n\nHello! [/INST]",
    "parameters": {
      "max_new_tokens": 1500,
      "temperature": 0.8,
      "return_full_text": false
    }
  }'
```

### Response Shape

```json
[
  {
    "generated_text": "Hello! How can I help you?"
  }
]
```

### TypeScript Implementation

```typescript
export async function callHuggingFace(sys: string, usr: string, max = 1500): Promise<string | null> {
  const key = process.env.HUGGINGFACE_API_KEY || process.env.hugging_face_api;
  if (!key) return null;
  try {
    const prompt = `<s>[INST] ${sys}\n\n${usr} [/INST]`;
    const res = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: max,
            temperature: 0.8,
            return_full_text: false,
          },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (Array.isArray(d) && d[0]?.generated_text) return d[0].generated_text.trim();
    return null;
  } catch { return null; }
}
```

### Best For
- 🆓 Free tier experiments
- 🔄 Fallback when other providers fail
- 📦 Bulk processing
- 🧪 Testing

---

## How the Providers Work Together

### The Provider Chain (`aiComplete()`)

All 5 providers are called in parallel. The first non-null response wins.

```typescript
// File: src/lib/ai.ts → aiComplete()
export async function aiComplete(sys, usr, max, useReasoning, providers?) {
  let chain;
  if (providers && providers.length > 0) {
    // Use the specified providers (from brain-router)
    chain = providers.map(name => PROVIDER_CALLERS[name]).filter(Boolean);
  } else {
    // Default chain: Groq → OpenRouter → Gemini → OpenAI → HuggingFace
    chain = useReasoning
      ? [callOpenAI, callGemini, callGroq, callOpenRouter, callHuggingFace]
      : [callGroq, callOpenRouter, callGemini, callOpenAI, callHuggingFace];
  }

  // Kick off all providers in parallel
  const promises = chain.map(p => p(sys, usr, max).catch(() => null));

  // Await in priority order — first non-null wins
  for (const p of promises) {
    const result = await p;
    if (result) return result;
  }
  return null;
}
```

### The Brain Router (Query-aware provider selection)

`brain-router.ts` analyzes each query and routes to the best provider:

```typescript
// Arabic query → Groq first (best Arabic support)
if (capabilities.includes("arabic")) {
  return ["groq", "gemini"];
}

// Vision query → Gemini first (best vision)
if (capabilities.includes("vision")) {
  return ["gemini", "openai", "groq"];
}

// Reasoning query → OpenAI or Gemini first
if (capabilities.includes("reasoning")) {
  return ["openai", "gemini", "groq"];
}

// Real-time query → Groq first (fastest)
if (latency === "real-time") {
  return ["groq", "gemini"];
}

// Default: balanced
return ["groq", "gemini", "openai", "huggingface"];
```

### Web Search Chain (in news-service)

The news-service uses a 3-tier chain for web search:

```
Tier 1: OpenRouter (openrouter/auto:online)  ← primary, best web search
   ↓ (if empty)
Tier 2: Gemini (gemini-2.0-flash-exp + google_search_retrieval)  ← Google grounding
   ↓ (if empty)
Tier 3: Groq (llama-3.3-70b-versatile)  ← LLM fallback (no live web)
```

---

## Environment Configuration

Create a `.env` file with your 5 API keys:

```bash
# .env
GROQ_API_KEY=gsk_your_groq_key_here
OPENROUTER_API_KEY=or_pat_your_openrouter_key_here
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=sk-svcacct-your_openai_key_here
HUGGINGFACE_API_KEY=hf_your_huggingface_key_here
```

All keys are optional — the Brain works with any subset of providers (it falls
back gracefully if a provider is unavailable).

---

## Rate Limits & Timeouts

| Provider | Timeout | Rate Limit | Notes |
|---|---|---|---|
| Groq | 15s | Free tier: 30 req/min | Fastest provider |
| OpenRouter | 20s | Varies by model | Web search adds latency |
| Gemini | 15s | Free tier: 15 req/min | Vision is slower |
| OpenAI | 20s | Pay-per-use | No rate limit on paid |
| HuggingFace | 20s | Free tier: limited | Cold starts can be slow |

The Brain includes a **circuit breaker** (`src/lib/circuit-breaker.ts`) that
automatically fails over when a provider is consistently failing.

---

## Summary

The CIRKLE Brain AI uses 5 AI providers with no ZAI dependency:

1. **Groq** — Fast, Arabic-friendly (free)
2. **OpenRouter** — Web search via `:online` suffix (free)
3. **Gemini** — Vision, reasoning, Google grounding (free)
4. **OpenAI** — Strong reasoning (paid)
5. **HuggingFace** — Free tier fallback (free)

All providers are called in parallel; the first non-null response wins. The
brain-router selects the best provider for each query type. Web search goes
through OpenRouter → Gemini grounding → Groq LLM fallback.

**5 providers. Zero ZAI. Total coverage.**
