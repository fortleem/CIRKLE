/**
 * Overlay Registry — the single source of truth for every overlay, tab, and
 * quick action in Cirkle. Consumed by:
 *   • `OverlayBrowser` (full-screen feature grid)
 *   • `CommandPalette` (⌘K launcher)
 *
 * 65 overlays total — sourced from:
 *   • 23 surfaced in the home-screen EXCLUSIVES grid
 *   • 6 shell panels (composer, governance, settings, ai, hub, pulse)
 *   • 26 overlay events from page.tsx (mood-chat → word-garden, minus dups)
 *   • 2 contact overlays (add-contact, contact-qr)
 *   • 7 Cirkle-* AI overlays (dna, mood, time-shift, verse, cirkle-shield, mint, visa-explorer)
 *   • 1 self-reference (overlay-browser)
 */

export type OverlayCategory =
  | "safety"
  | "social"
  | "media"
  | "ai"
  | "travel"
  | "finance"
  | "privacy"
  | "productivity"
  | "health";

export interface OverlayEntry {
  id: string;           // e.g. "citizen-shield"
  name: string;         // e.g. "Citizen Shield"
  description: string;  // short description
  emoji: string;        // emoji icon
  category: OverlayCategory;
  event: string;        // e.g. "circle:citizen-shield"
  keywords?: string[];  // optional search keywords
}

export const OVERLAY_REGISTRY: OverlayEntry[] = [
  // ── EXCLUSIVES (23) ──────────────────────────────────────────────────
  {
    id: "time-capsule",
    name: "Time Capsule",
    description: "Schedule a message to unlock on a future date — letters to your future self.",
    emoji: "⏰",
    category: "social",
    event: "circle:time-capsule",
    keywords: ["schedule", "future", "letter", "delayed", "memory"],
  },
  {
    id: "mood-feed",
    name: "Mood Feed",
    description: "Tell Cirkle your mood and the AI reshapes your entire feed in seconds.",
    emoji: "🎭",
    category: "ai",
    event: "circle:mood-feed",
    keywords: ["emotion", "reshape", "personalize", "vibe"],
  },
  {
    id: "privacy-shield",
    name: "Privacy Shield",
    description: "One tap to blur every sensitive thing on screen — perfect for sharing your phone.",
    emoji: "🛡️",
    category: "privacy",
    event: "circle:privacy-shield",
    keywords: ["blur", "screen", "share", "hide", "sensitive"],
  },
  {
    id: "receipt-split",
    name: "Receipt Split",
    description: "Point the camera at a bill — AI extracts items and splits them with friends.",
    emoji: "🧾",
    category: "finance",
    event: "circle:receipt-split",
    keywords: ["bill", "split", "ocr", "friends", "scan"],
  },
  {
    id: "circle-aura",
    name: "Cirkle Aura",
    description: "A live animated aura that reflects your real-time activity across every pillar.",
    emoji: "✨",
    category: "social",
    event: "circle:circle-aura",
    keywords: ["animated", "activity", "live", "ambient"],
  },
  {
    id: "whisper-mode",
    name: "Whisper Mode",
    description: "Self-destructing voice notes with AI transcription + translation.",
    emoji: "👻",
    category: "privacy",
    event: "circle:whisper-mode",
    keywords: ["voice", "self-destruct", "transcribe", "ephemeral"],
  },
  {
    id: "circle-lens",
    name: "Cirkle Lens",
    description: "Cultural AR filters for photos & video — processed on-device.",
    emoji: "📷",
    category: "media",
    event: "circle:circle-lens",
    keywords: ["ar", "filter", "camera", "cultural"],
  },
  {
    id: "live-translate",
    name: "Live Translate",
    description: "Real-time subtitles during Wasl video calls — translated on-device.",
    emoji: "🌐",
    category: "productivity",
    event: "circle:live-translate",
    keywords: ["subtitle", "translation", "call", "realtime"],
  },
  {
    id: "group-memory",
    name: "Group Memory",
    description: "AI scrapbook of your Circle's best moments — generated on-device.",
    emoji: "📖",
    category: "social",
    event: "circle:group-memory",
    keywords: ["scrapbook", "ai", "circle", "moments"],
  },
  {
    id: "vibe-match",
    name: "Vibe Match",
    description: "Meet nearby people who share your vibe — privacy-preserving.",
    emoji: "🛰️",
    category: "social",
    event: "circle:vibe-match",
    keywords: ["nearby", "match", "discover", "people"],
  },
  {
    id: "ai-recap",
    name: "AI Recap",
    description: "Your day in 5 bullets — generated on-device, shared to Midan.",
    emoji: "🪄",
    category: "ai",
    event: "circle:ai-recap",
    keywords: ["summary", "daily", "bullets", "recap"],
  },
  {
    id: "universal-story",
    name: "Universal Story",
    description: "Post once — AI optimizes for 4 pillars with live previews.",
    emoji: "🧩",
    category: "media",
    event: "circle:universal-story",
    keywords: ["cross-post", "optimize", "pillars", "story"],
  },
  {
    id: "vessel-tracker",
    name: "Vessel Tracker",
    description: "Live AIS map of nearby vessels — port finder, search, filters.",
    emoji: "🚢",
    category: "travel",
    event: "circle:vessel-tracker",
    keywords: ["ais", "ship", "port", "marine", "map"],
  },
  {
    id: "smart-inbox",
    name: "Smart Inbox",
    description: "5 collapsible categories · AI 3-sentence summary · auto-replies.",
    emoji: "🧠",
    category: "productivity",
    event: "circle:smart-inbox",
    keywords: ["mail", "categories", "summary", "auto-reply"],
  },
  {
    id: "citizen-shield",
    name: "Citizen Shield",
    description: "Report government issues · AI-verified evidence · auto-routing.",
    emoji: "🛡️",
    category: "safety",
    event: "circle:citizen-shield",
    keywords: ["government", "report", "civic", "issue"],
  },
  {
    id: "cirkle-commit",
    name: "CirkleCommit",
    description: "AI-verified agreements with escrow. Price, work, service contracts.",
    emoji: "🤝",
    category: "finance",
    event: "circle:commit",
    keywords: ["agreement", "escrow", "contract", "verify"],
  },
  {
    id: "cirkle-oracle",
    name: "CirkleOracle",
    description: "AI predicts: prices, travel, social, government, visa. Be ahead.",
    emoji: "🔮",
    category: "ai",
    event: "circle:oracle",
    keywords: ["predict", "forecast", "future", "trends"],
  },
  {
    id: "cirkle-sentinel",
    name: "CirkleSentinel",
    description: "AI safety guardian. Scam detection, phishing blocker, fraud alert.",
    emoji: "🛡️",
    category: "safety",
    event: "circle:sentinel",
    keywords: ["scam", "phishing", "fraud", "guardian"],
  },
  {
    id: "cirkle-spark",
    name: "CirkleSpark",
    description: "AI idea incubator. Pitch → evaluate → co-founders → action plan.",
    emoji: "💡",
    category: "ai",
    event: "circle:spark",
    keywords: ["idea", "incubator", "startup", "cofounder"],
  },
  {
    id: "cirkle-create",
    name: "CirkleCreate",
    description: "AI creative studio. Image, video, writing, music generation.",
    emoji: "🎨",
    category: "ai",
    event: "circle:create",
    keywords: ["studio", "image", "video", "music", "writing"],
  },
  {
    id: "cirkle-learn",
    name: "CirkleLearn",
    description: "AI personal tutor. Languages, coding, exam prep, cultural.",
    emoji: "📚",
    category: "ai",
    event: "circle:learn",
    keywords: ["tutor", "language", "coding", "exam"],
  },
  {
    id: "cirkle-grow",
    name: "CirkleGrow",
    description: "AI life coach. Goals, habits, streaks, weekly AI review.",
    emoji: "🌱",
    category: "productivity",
    event: "circle:grow",
    keywords: ["coach", "goals", "habits", "streaks"],
  },
  {
    id: "cirkle-care",
    name: "CirkleCare",
    description: "AI health companion. 100% on-device. Symptoms, mood, meds.",
    emoji: "❤️",
    category: "health",
    event: "circle:care",
    keywords: ["health", "symptoms", "meds", "wellness"],
  },
  {
    id: "cirkle-identity",
    name: "Cirkle ID",
    description: "Zero-knowledge identity attestations. Prove age, nationality, profession without revealing data.",
    emoji: "🪪",
    category: "privacy",
    event: "circle:identity",
    keywords: ["identity", "zk", "attestation", "verify", "oidc", "claim"],
  },
  {
    id: "shield-dashboard",
    name: "Shield Dashboard",
    description: "Civic infrastructure. Publish Civic Waves, track impact, journalist safety mode.",
    emoji: "🏛️",
    category: "safety",
    event: "circle:shield-dashboard",
    keywords: ["civic", "wave", "infrastructure", "journalist", "safety", "ngo", "impact"],
  },

  // ── Shell panels (6) ─────────────────────────────────────────────────
  {
    id: "composer",
    name: "Composer",
    description: "Compose posts, polls, and media for any Cirkle pillar.",
    emoji: "📝",
    category: "productivity",
    event: "circle:composer",
    keywords: ["post", "poll", "media", "write"],
  },
  {
    id: "governance",
    name: "Governance Center",
    description: "View and vote on community proposals for the Cirkle protocol.",
    emoji: "⚖️",
    category: "productivity",
    event: "circle:governance",
    keywords: ["vote", "proposal", "dao", "council"],
  },
  {
    id: "settings",
    name: "Settings",
    description: "Adjust account, privacy, appearance, and language preferences.",
    emoji: "⚙️",
    category: "productivity",
    event: "circle:settings",
    keywords: ["account", "preferences", "language", "theme"],
  },
  {
    id: "ai",
    name: "Cirkle AI Assistant",
    description: "Ask anything. On-device AI with deep app integration.",
    emoji: "🤖",
    category: "ai",
    event: "circle:ai",
    keywords: ["assistant", "chatbot", "ask", "orb"],
  },
  {
    id: "hub",
    name: "Cirkle Hub",
    description: "Browse all 18 pillars of Cirkle from one place.",
    emoji: "🧭",
    category: "productivity",
    event: "circle:hub",
    keywords: ["pillars", "browse", "navigator"],
  },
  {
    id: "pulse",
    name: "Cirkle Pulse",
    description: "Live city biome with real-time activity from your area.",
    emoji: "📊",
    category: "social",
    event: "circle:pulse",
    keywords: ["city", "live", "biome", "activity"],
  },

  // ── Overlay events (mood-chat → word-garden, 26) ─────────────────────
  {
    id: "mood-chat",
    name: "Mood Chat",
    description: "Chat that adapts tone and emoji to your current mood.",
    emoji: "💬",
    category: "social",
    event: "circle:mood-chat",
    keywords: ["adaptive", "tone", "emoji", "emotion"],
  },
  {
    id: "voice-clone",
    name: "Voice Clone",
    description: "Clone your voice for TTS in 12 languages. Privacy-preserving.",
    emoji: "🎙️",
    category: "ai",
    event: "circle:voice-clone",
    keywords: ["tts", "clone", "speech", "voice"],
  },
  {
    id: "tribe-chat",
    name: "Tribe Chat",
    description: "Topic-based public chat rooms with mesh relay.",
    emoji: "👥",
    category: "social",
    event: "circle:tribe-chat",
    keywords: ["topic", "public", "room", "mesh"],
  },
  {
    id: "ai-mediator",
    name: "AI Mediator",
    description: "AI mediator for resolving group conflicts and tense threads.",
    emoji: "🕊️",
    category: "safety",
    event: "circle:ai-mediator",
    keywords: ["conflict", "resolution", "moderator", "peace"],
  },
  {
    id: "note-self",
    name: "Note to Self",
    description: "Quick private notes pinned to your own profile.",
    emoji: "📝",
    category: "productivity",
    event: "circle:note-self",
    keywords: ["note", "private", "pin", "self"],
  },
  {
    id: "word-aura",
    name: "Word Aura",
    description: "Visual aura around messages that reflects sentiment in real-time.",
    emoji: "✨",
    category: "media",
    event: "circle:word-aura",
    keywords: ["sentiment", "visual", "glow", "message"],
  },
  {
    id: "chat-maze",
    name: "Chat Maze",
    description: "Branching, choose-your-own-adventure chat stories.",
    emoji: "🌀",
    category: "social",
    event: "circle:chat-maze",
    keywords: ["branching", "story", "adventure", "interactive"],
  },
  {
    id: "ghost-inbox",
    name: "Ghost Inbox",
    description: "Anonymous read-only inbox for one-time contacts.",
    emoji: "👻",
    category: "privacy",
    event: "circle:ghost-inbox",
    keywords: ["anonymous", "ephemeral", "inbox", "one-time"],
  },
  {
    id: "ai-director",
    name: "AI Director",
    description: "AI directs multi-cam videos from a single clip.",
    emoji: "🎬",
    category: "media",
    event: "circle:ai-director",
    keywords: ["multicam", "direct", "edit", "video"],
  },
  {
    id: "co-watch",
    name: "Co-Watch",
    description: "Watch Mashahd videos together in sync with friends.",
    emoji: "📺",
    category: "social",
    event: "circle:co-watch",
    keywords: ["sync", "together", "party", "watch"],
  },
  {
    id: "color-story",
    name: "Color Story",
    description: "Auto-pick palette from any photo for cohesive Stories.",
    emoji: "🎨",
    category: "media",
    event: "circle:color-story",
    keywords: ["palette", "color", "cohesive", "story"],
  },
  {
    id: "debate-arena",
    name: "Debate Arena",
    description: "Structured AI-refereed debates with public voting.",
    emoji: "🥊",
    category: "social",
    event: "circle:debate-arena",
    keywords: ["debate", "referee", "vote", "argument"],
  },
  {
    id: "echo-breaker",
    name: "Echo Breaker",
    description: "Surfaces dissenting views to break your filter bubble.",
    emoji: "🔊",
    category: "social",
    event: "circle:echo-breaker",
    keywords: ["dissenting", "filter bubble", "perspective"],
  },
  {
    id: "echo-remix",
    name: "Echo Remix",
    description: "Remix any post into a different pillar's format.",
    emoji: "🔄",
    category: "media",
    event: "circle:echo-remix",
    keywords: ["remix", "format", "cross-post", "transform"],
  },
  {
    id: "lamahat-viewer",
    name: "Lamahat Viewer",
    description: "Full-screen photo viewer with story mode and genealogy.",
    emoji: "📸",
    category: "media",
    event: "circle:lamahat-viewer",
    keywords: ["photo", "viewer", "fullscreen", "story"],
  },
  {
    id: "living-photos",
    name: "Living Photos",
    description: "Turn a still photo into a 2-second motion loop on-device.",
    emoji: "🌅",
    category: "media",
    event: "circle:living-photos",
    keywords: ["motion", "loop", "cinemagraph", "animate"],
  },
  {
    id: "mashahd-player",
    name: "Mashahd Player",
    description: "Video player with smart chapters, recap, and co-watch.",
    emoji: "🎬",
    category: "media",
    event: "circle:mashahd-player",
    keywords: ["video", "player", "chapters", "recap"],
  },
  {
    id: "mesh-presence",
    name: "Mesh Presence",
    description: "See nearby mesh peers without internet or cellular.",
    emoji: "📶",
    category: "privacy",
    event: "circle:mesh-presence",
    keywords: ["mesh", "nearby", "offline", "peers"],
  },
  {
    id: "mood-player",
    name: "Mood Player",
    description: "Picks music that matches your mood from local library.",
    emoji: "🎵",
    category: "media",
    event: "circle:mood-player",
    keywords: ["music", "mood", "playlist", "local"],
  },
  {
    id: "mosaic-stories",
    name: "Mosaic Stories",
    description: "Combine 6 photos into one tappable mosaic Story.",
    emoji: "🧩",
    category: "media",
    event: "circle:mosaic-stories",
    keywords: ["mosaic", "grid", "collage", "story"],
  },
  {
    id: "photo-genealogy",
    name: "Photo Genealogy",
    description: "Trace how a photo spread across the network.",
    emoji: "🌳",
    category: "media",
    event: "circle:photo-genealogy",
    keywords: ["trace", "spread", "provenance", "history"],
  },
  {
    id: "smart-chapters",
    name: "Smart Chapters",
    description: "AI auto-splits long videos into chapters with titles.",
    emoji: "📑",
    category: "media",
    event: "circle:smart-chapters",
    keywords: ["chapters", "auto", "split", "video"],
  },
  {
    id: "thread-theatre",
    name: "Thread Theatre",
    description: "Turn long threads into a navigable play with scenes.",
    emoji: "🎭",
    category: "media",
    event: "circle:thread-theatre",
    keywords: ["thread", "navigable", "scenes", "play"],
  },
  {
    id: "time-shift-cam",
    name: "Time-Shift Cam",
    description: "Capture 2 seconds before and after the shutter.",
    emoji: "⏱️",
    category: "media",
    event: "circle:time-shift-cam",
    keywords: ["timeshift", "before", "after", "shutter"],
  },
  {
    id: "topic-dna",
    name: "Topic DNA",
    description: "Visualize how a topic evolves across posts and time.",
    emoji: "🧬",
    category: "ai",
    event: "circle:topic-dna",
    keywords: ["topic", "evolve", "visualize", "trend"],
  },
  {
    id: "word-garden",
    name: "Word Garden",
    description: "Grow a personal garden of words you've learned.",
    emoji: "🌷",
    category: "ai",
    event: "circle:word-garden",
    keywords: ["vocabulary", "learn", "garden", "words"],
  },

  // ── Contact overlays (2) ─────────────────────────────────────────────
  {
    id: "add-contact",
    name: "Add Contact",
    description: "Add a new Cirkle contact by username, QR, or mesh.",
    emoji: "👋",
    category: "social",
    event: "circle:add-contact",
    keywords: ["add", "friend", "username", "qr"],
  },
  {
    id: "contact-qr",
    name: "Contact QR",
    description: "Show your personal QR code for instant add.",
    emoji: "📱",
    category: "social",
    event: "circle:contact-qr",
    keywords: ["qr", "share", "code", "add"],
  },

  // ── Cirkle-* AI overlays (7) ─────────────────────────────────────────
  {
    id: "cirkle-dna",
    name: "Cirkle DNA",
    description: "Your personality fingerprint, generated on-device.",
    emoji: "🧬",
    category: "ai",
    event: "circle:dna",
    keywords: ["personality", "fingerprint", "identity", "trait"],
  },
  {
    id: "cirkle-mood",
    name: "Cirkle Mood",
    description: "Track mood over time with AI insights.",
    emoji: "🎭",
    category: "health",
    event: "circle:mood",
    keywords: ["mood", "track", "insights", "wellness"],
  },
  {
    id: "cirkle-time",
    name: "Cirkle Time",
    description: "Time-shift your day with AI planning and reminders.",
    emoji: "⏱️",
    category: "productivity",
    event: "circle:time-shift",
    keywords: ["planner", "reminders", "schedule", "focus"],
  },
  {
    id: "cirkle-verse",
    name: "Cirkle Verse",
    description: "Generate Arabic poetry in classical forms with AI.",
    emoji: "📜",
    category: "ai",
    event: "circle:verse",
    keywords: ["poetry", "arabic", "classical", "generate"],
  },
  {
    id: "cirkle-shield",
    name: "Cirkle Shield",
    description: "Cross-pillar shield: scam detection, evidence vault.",
    emoji: "🛡️",
    category: "safety",
    event: "circle:cirkle-shield",
    keywords: ["cross-pillar", "scam", "evidence", "vault"],
  },
  {
    id: "cirkle-mint",
    name: "Cirkle Mint",
    description: "Mint verified digital credentials and badges on-device.",
    emoji: "🪙",
    category: "finance",
    event: "circle:mint",
    keywords: ["mint", "credential", "badge", "verify"],
  },
  {
    id: "visa-explorer",
    name: "Visa Explorer",
    description: "Browse visa-free destinations for your passport.",
    emoji: "✈️",
    category: "travel",
    event: "circle:visa-explorer",
    keywords: ["visa", "passport", "travel", "destinations"],
  },

  // ── Self: Overlay Browser (1) ────────────────────────────────────────
  {
    id: "overlay-browser",
    name: "All Features",
    description: "Browse all 65 Cirkle overlays in one place.",
    emoji: "🧭",
    category: "productivity",
    event: "circle:overlay-browser",
    keywords: ["browse", "all", "features", "discover", "search"],
  },

  // ── Personal AI OS (Feature 5) ──────────────────────────────────────
  {
    id: "personal-ai",
    name: "Personal AI OS",
    description: "Your DNA, Mood, and Topic DNA in one. The AI that learns you, on-device.",
    emoji: "🧬",
    category: "ai",
    event: "circle:personal-ai",
    keywords: ["dna", "mood", "topic", "memory", "personalization", "fingerprint", "personality"],
  },

  // ── Killer features 3 & 4 ───────────────────────────────────────────
  {
    id: "mesh-dashboard",
    name: "Mesh Network",
    description: "Offline messages + payments + file transfer. Cirkle works without internet.",
    emoji: "📡",
    category: "privacy",
    event: "circle:mesh-dashboard",
    keywords: ["mesh", "offline", "peer-to-peer", "webrtc", "broadcast", "queue", "tamper", "relay"],
  },
  {
    id: "oracle-markets",
    name: "Oracle Markets",
    description: "Prediction markets on news, sports, crypto, visa. AI-powered probabilities.",
    emoji: "📊",
    category: "ai",
    event: "circle:oracle-markets",
    keywords: ["prediction", "market", "lmsr", "bet", "forecast", "probability", "outcomes", "resolve"],
  },
  {
    id: "data-residency",
    name: "Data Residency",
    description: "Your data stays in your region. PDPL/GDPR/PIPL/FZ-242 compliant.",
    emoji: "🌍",
    category: "privacy",
    event: "circle:data-residency",
    keywords: ["residency", "localization", "pdpl", "gdpr", "pipl", "fz-242", "region", "compliance", "dpo", "breach", "authority", "data", "sovereignty"],
  },

  // ── Creator monetization ─────────────────────────────────────────────
  {
    id: "creator-studio",
    name: "Creator Studio",
    description: "Monetize your content. Micropayments, subscriptions, Mint verified badge.",
    emoji: "💰",
    category: "finance",
    event: "circle:creator-studio",
    keywords: ["creator", "monetize", "micropayment", "subscription", "earnings", "badge", "mint", "support", "patron", "tip", "tip jar"],
  },

  // ── VoIP + Bot Developer ────────────────────────────────────────────
  {
    id: "call-screen",
    name: "Cirkle Call",
    description: "Voice + video calls with live on-device translation.",
    emoji: "📞",
    category: "social",
    event: "circle:start-call",
    keywords: ["voip", "webrtc", "video", "voice", "call", "translate", "live", "subtitles"],
  },
  {
    id: "bot-developer",
    name: "Bot Developer",
    description: "Build bots and mini-apps for Cirkle. API keys, webhooks, SDK.",
    emoji: "🤖",
    category: "productivity",
    event: "circle:bot-developer",
    keywords: ["bot", "mini-app", "sdk", "api", "webhook", "developer", "automation"],
  },

  // ── Blueprint BLUEPRINT-2: Local Ads, Education, Wiki ──────────────
  {
    id: "ad-studio",
    name: "Ad Studio",
    description: "Non-targeted local ads. Advertiser portal, CPM campaigns, invoice billing.",
    emoji: "📺",
    category: "finance",
    event: "circle:ad-studio",
    keywords: ["ad", "advertiser", "cpm", "campaign", "invoice", "local", "sponsor", "billing", "revenue"],
  },
  {
    id: "cirkle-gradebook",
    name: "Cirkle Gradebook",
    description: "Assignments, grades, attendance. Free for schools, K-12, universities.",
    emoji: "🎓",
    category: "productivity",
    event: "circle:cirkle-gradebook",
    keywords: ["education", "school", "university", "k-12", "assignment", "grade", "attendance", "teacher", "student", "class", "classroom"],
  },
  {
    id: "knowledge-wiki",
    name: "Knowledge Wiki",
    description: "Collaborative Markdown wikis for your Circles. Version history included.",
    emoji: "📚",
    category: "productivity",
    event: "circle:knowledge-wiki",
    keywords: ["wiki", "markdown", "documentation", "knowledge", "ipfs", "version", "history", "collaborative", "circle", "pages"],
  },

  // ── Blueprint round 3 ─────────────────────────────────────────────────
  {
    id: "poll-creator",
    name: "Polls & Quizzes",
    description: "Create polls for your posts and Circles. Live results, 1h–7d durations.",
    emoji: "📊",
    category: "social",
    event: "circle:poll-creator",
    keywords: ["poll", "vote", "quiz", "survey", "results", "live"],
  },
  {
    id: "bullet-comments",
    name: "Bullet Comments",
    description: "Bilibili-style scrolling comments on videos. Real-time overlay.",
    emoji: "💬",
    category: "media",
    event: "circle:bullet-comments",
    keywords: ["bullet", "danmaku", "scrolling", "overlay", "video", "bilibili"],
  },
  {
    id: "family-vault",
    name: "Family Vault",
    description: "Encrypted family album. Cloud-free, passphrase-protected.",
    emoji: "👨‍👩‍👧",
    category: "privacy",
    event: "circle:family-vault",
    keywords: ["family", "vault", "album", "encrypted", "passphrase", "photo"],
  },
  {
    id: "ticket-mint",
    name: "Ticket Mint",
    description: "Decentralised event tickets. Ed25519-signed, QR-verifiable, no fees.",
    emoji: "🎫",
    category: "finance",
    event: "circle:ticket-mint",
    keywords: ["ticket", "event", "ed25519", "signature", "qr", "verify", "decentralised"],
  },
  {
    id: "phone-migrate",
    name: "Phone Migration",
    description: "Encrypted backup + QR migration. Move your Cirkle to a new phone.",
    emoji: "🔄",
    category: "privacy",
    event: "circle:phone-migrate",
    keywords: ["backup", "migration", "phone", "encrypted", "qr", "restore", "aes"],
  },
  {
    id: "brain-orchestrator",
    name: "Brain Orchestrator",
    description: "AI connecting all features. Cross-pillar workflows + smart suggestions.",
    emoji: "🧠",
    category: "ai",
    event: "circle:orchestrator",
    keywords: ["ai", "brain", "orchestrator", "workflow", "connect", "suggest", "smart"],
  },
  {
    id: "broadcast-channel",
    name: "Broadcast Channel",
    description: "Create one-to-many broadcast channels. Owner-only send, subscriber analytics.",
    emoji: "📢",
    category: "social",
    event: "circle:broadcast-channel",
    keywords: ["broadcast", "channel", "announce", "news", "subscribe", "wasl"],
  },
  {
    id: "gif-picker",
    name: "GIF & Sticker Picker",
    description: "On-device GIF and sticker search. IPFS-ready, custom upload.",
    emoji: "🎞️",
    category: "social",
    event: "circle:gif-picker",
    keywords: ["gif", "sticker", "emoji", "image", "search", "ipfs", "wasl"],
  },
  {
    id: "work-mode",
    name: "Work Mode (Maktab)",
    description: "Self-hosted workspaces. Admin tools, audit log, retention, export.",
    emoji: "💼",
    category: "productivity",
    event: "circle:work-mode",
    keywords: ["work", "maktab", "workspace", "admin", "audit", "retention", "team"],
  },
  {
    id: "device-verify",
    name: "Device Verification",
    description: "E2EE QR verification. SAS emoji comparison. Olm/Megolm key verification.",
    emoji: "🔐",
    category: "privacy",
    event: "circle:device-verify",
    keywords: ["verify", "device", "e2ee", "qr", "sas", "olm", "megolm", "encryption"],
  },
  {
    id: "memory-dashboard",
    name: "Personal Memory Brain",
    description: "Your permanent cognitive memory. 13 categories, encrypted, user-controlled, GDPR compliant.",
    emoji: "🧠",
    category: "ai",
    event: "circle:memory",
    keywords: ["memory", "brain", "personal", "preferences", "identity", "routine", "goal", "learning", "privacy", "gdpr"],
  },

  // ── Blueprint §14 / §20 / §23 pillars ────────────────────────────────
  {
    id: "pro-network",
    name: "Professional Network",
    description: "Jobs, profiles, endorsements, anonymous salary insights. Free forever.",
    emoji: "💼",
    category: "productivity",
    event: "circle:pro-network",
    keywords: ["jobs", "careers", "linkedin", "professional", "endorsement", "salary", "hire", "recruit"],
  },
  {
    id: "cirkle-maps",
    name: "Cirkle Maps",
    description: "Free OSM maps, routing, geocoding. Privacy-first, no tracking.",
    emoji: "🗺️",
    category: "travel",
    event: "circle:cirkle-maps",
    keywords: ["map", "osm", "openstreetmap", "routing", "directions", "geocode", "navigation", "osrm"],
  },
  {
    id: "circle-mail",
    name: "Cirkle Mail",
    description: "Free @cirkle.app email. AI triage, on-device privacy.",
    emoji: "📧",
    category: "productivity",
    event: "circle:circle-mail",
    keywords: ["mail", "email", "inbox", "compose", "ai triage", "summarize", "@cirkle.app"],
  },
];

// ── Category metadata ──────────────────────────────────────────────────

export const CATEGORY_META: Record<OverlayCategory, { label: string; emoji: string }> = {
  safety:       { label: "Safety",       emoji: "🛡️" },
  social:       { label: "Social",       emoji: "👥" },
  media:        { label: "Media",        emoji: "🎬" },
  ai:           { label: "AI",           emoji: "🤖" },
  travel:       { label: "Travel",       emoji: "✈️" },
  finance:      { label: "Finance",      emoji: "💰" },
  privacy:      { label: "Privacy",      emoji: "🔒" },
  productivity: { label: "Productivity", emoji: "⚡" },
  health:       { label: "Health",       emoji: "❤️" },
};

/** Group all overlays by category, preserving registry order within a group. */
export function getOverlaysByCategory(): Record<OverlayCategory, OverlayEntry[]> {
  const acc = {} as Record<OverlayCategory, OverlayEntry[]>;
  for (const cat of Object.keys(CATEGORY_META) as OverlayCategory[]) acc[cat] = [];
  for (const entry of OVERLAY_REGISTRY) acc[entry.category].push(entry);
  return acc;
}

// ── Command palette entries ────────────────────────────────────────────

export interface CommandEntry {
  id: string;
  label: string;
  type: "overlay" | "tab" | "action";
  icon?: string;
  event?: string;
  tab?: string;
  keywords?: string[];
}

/** The 8 main tabs surfaced in the Dock. */
const TAB_COMMANDS: CommandEntry[] = [
  { id: "tab-home",    label: "Go to Home",      type: "tab", icon: "🏠", tab: "home",    keywords: ["dashboard", "main"] },
  { id: "tab-wasl",    label: "Go to Wasl",      type: "tab", icon: "💬", tab: "wasl",    keywords: ["chat", "messages"] },
  { id: "tab-mashahd", label: "Go to Mashahd",   type: "tab", icon: "🎬", tab: "mashahd", keywords: ["video", "watch"] },
  { id: "tab-lamahat", label: "Go to Lamahat",   type: "tab", icon: "📸", tab: "lamahat", keywords: ["photos", "gallery"] },
  { id: "tab-midan",   label: "Go to Midan",     type: "tab", icon: "📢", tab: "midan",   keywords: ["square", "posts", "public"] },
  { id: "tab-rihla",   label: "Go to Rihla",     type: "tab", icon: "✈️", tab: "rihla",   keywords: ["travel", "trips"] },
  { id: "tab-pay",     label: "Go to Cirkle Pay", type: "tab", icon: "💳", tab: "pay",    keywords: ["money", "wallet", "scan"] },
  { id: "tab-profile", label: "Go to Profile",   type: "tab", icon: "👤", tab: "profile", keywords: ["me", "account", "you"] },
];

/** 4 quick actions surfaced at the top of the palette. */
const QUICK_ACTIONS: CommandEntry[] = [
  {
    id: "act-compose",
    label: "Compose post to Midan",
    type: "action",
    icon: "📝",
    event: "circle:composer",
    keywords: ["post", "write", "midan", "poll", "media"],
  },
  {
    id: "act-scan-pay",
    label: "Scan & pay",
    type: "action",
    icon: "📷",
    event: "circle:navigate",
    tab: "pay",
    keywords: ["scan", "qr", "pay", "money"],
  },
  {
    id: "act-ghost-mode",
    label: "Toggle Ghost mode",
    type: "action",
    icon: "👻",
    event: "circle:ghost-mode",
    keywords: ["invisible", "privacy", "hide", "ghost"],
  },
  {
    id: "act-overlay-browser",
    label: "Browse all features",
    type: "action",
    icon: "🧭",
    event: "circle:overlay-browser",
    keywords: ["all", "browse", "discover", "search", "features"],
  },
];

/**
 * Build the full command list for the ⌘K palette:
 *   1. Quick actions (4)
 *   2. Tabs (8)
 *   3. Every overlay (65, including the overlay-browser self-entry)
 */
export function getCommandEntries(): CommandEntry[] {
  const overlayEntries: CommandEntry[] = OVERLAY_REGISTRY.map((o) => ({
    id: `ovl-${o.id}`,
    label: o.name,
    type: "overlay",
    icon: o.emoji,
    event: o.event,
    keywords: o.keywords,
  }));
  return [...QUICK_ACTIONS, ...TAB_COMMANDS, ...overlayEntries];
}

/** Total count, useful for the home-screen tile ("Browse all 65 Cirkle overlays"). */
export const OVERLAY_COUNT = OVERLAY_REGISTRY.length;
