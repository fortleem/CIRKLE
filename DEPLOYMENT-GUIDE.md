# 🚀 Vercel Deployment Guide — Get Clean URL

## Current Situation

| URL | Status | Issue |
|---|---|---|
| `cirkle.vercel.app` | ❌ Taken | Serves "Circle - Call Coordination" (different app) |
| `cirkle-app.vercel.app` | ❌ Taken | Serves "Cirkle — Search second-hand fashion" (different app) |
| `cirkle-mohamed-eltonsys-projects.vercel.app` | ✅ Working | Long URL (team account) + Deployment Protection |
| **`cirkle-brain-ai.vercel.app`** | ✅ **Available** | **BEST option — clean + descriptive** |
| `cirkle-brain.vercel.app` | ✅ Available | Also clean |
| `cirkle-ai.vercel.app` | ✅ Available | Also clean |

## WHY the URL Changed

The Vercel project was linked to a **TEAM account** (`mohamed-eltonsys-projects`) instead of a **PERSONAL account**. Vercel's URL format:

```
Personal account:  {project-name}.vercel.app
Team account:      {project-name}-{team-name}.vercel.app
```

The old `cirkle.vercel.app` was a personal account deployment. When the project was moved to the team, the URL became `cirkle-mohamed-eltonsys-projects.vercel.app`.

## How to Get a Clean URL (`cirkle-brain-ai.vercel.app`)

### Option A: Create New Personal Project (Recommended)

Run these commands from your local terminal (requires Vercel CLI auth):

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to your PERSONAL Vercel account
vercel login

# 3. Remove old team project link
rm .vercel/project.json

# 4. Link to a NEW personal project named "cirkle-brain-ai"
vercel link --yes
# When prompted:
#   - Set up and deploy? → Y
#   - Which scope? → Your personal account
#   - Project name? → cirkle-brain-ai
#   - Framework? → Next.js

# 5. Set environment variables
vercel env add GROQ_API_KEY
vercel env add OPENROUTER_API_KEY
vercel env add GEMINI_API_KEY
vercel env add OPENAI_API_KEY
vercel env add HUGGINGFACE_API_KEY
vercel env add DATABASE_URL
# (paste each value when prompted)

# 6. Deploy to production
vercel --prod

# Your app will be live at: https://cirkle-brain-ai.vercel.app
```

### Option B: Move Current Project to Personal Account

1. Go to https://vercel.com/mohamed-eltonsys-projects/cirkle/settings
2. Scroll to "Transfer Project"
3. Transfer to your personal account
4. The URL will change from `cirkle-mohamed-eltonsys-projects.vercel.app` to `cirkle.vercel.app` (if available) or you'll need to rename

### Option C: Add Custom Domain

1. Go to https://vercel.com/mohamed-eltonsys-projects/cirkle/settings/domains
2. Add your custom domain (e.g., `cirkle.com`, `cirkle.app`, `brain.cirkle.app`)
3. Update DNS records as instructed by Vercel

### Option D: Disable Deployment Protection (Quick Fix)

The current URL works but redirects to Vercel login. To make it publicly accessible:

1. Go to https://vercel.com/mohamed-eltonsys-projects/cirkle/settings/deployment-protection
2. Turn OFF "Vercel Authentication" (Deployment Protection)
3. The URL `cirkle-mohamed-eltonsys-projects.vercel.app` will be publicly accessible

## Environment Variables to Set

Copy these from your local `.env` file (DO NOT commit actual keys to GitHub):

```
GROQ_API_KEY=<your-groq-key>
OPENROUTER_API_KEY=<your-openrouter-key>
GEMINI_API_KEY=<your-gemini-key>
OPENAI_API_KEY=<your-openai-key>
HUGGINGFACE_API_KEY=<your-huggingface-key>
DATABASE_URL=file:/tmp/cirkle.db
```

**Note:** GitHub Push Protection blocks commits containing API keys. The actual keys are in your local `.env` file — never commit them to the repository.

## Summary

| What | Status |
|---|---|
| Old URL `cirkle.vercel.app` | ❌ Taken by another app — CANNOT be recovered |
| Current URL (team) | ✅ Working but long + has Deployment Protection |
| Best alternative | `cirkle-brain-ai.vercel.app` (available, clean, descriptive) |
| GitHub repo | ✅ In sync (`fortleem/CIRKLE`) |
| CI | ✅ Passing |
| Local | ✅ Working (0 lint errors, AIKE operational) |
