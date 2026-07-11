import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleOracle — AI Prediction Engine.
// Mock-backed route: GET returns the 5 seeded predictions + model info,
// POST accepts an arbitrary natural-language question and returns a synthesized
// prediction with a confidence score + recommended action.
// ─────────────────────────────────────────────────────────────────────────────

export type OracleCategory =
  | "financial"
  | "travel"
  | "social"
  | "government"
  | "visa"
  | "health"
  | "weather"
  | "career";

export interface OraclePrediction {
  id: string;
  category: OracleCategory;
  categoryEmoji: string;
  categoryLabel: string;
  prediction: string;
  detail: string;
  confidence: number; // 0-100
  recommendedAction: string;
  actionLabel: string;
  horizon: string; // e.g. "12 days", "next week"
  signals: string[];
}

const SAMPLE_PREDICTIONS: OraclePrediction[] = [
  {
    id: "op-1",
    category: "financial",
    categoryEmoji: "💰",
    categoryLabel: "Financial",
    prediction: "Based on your spending, you'll run out of budget in 12 days",
    detail: "You're averaging 87 SAR/day against a remaining monthly budget of 1,040 SAR. Three recurring subscriptions renew on day 9, which will accelerate the burn rate.",
    confidence: 87,
    recommendedAction: "Skip 2 dining-out days this week to extend the runway to 18 days.",
    actionLabel: "Apply spending freeze",
    horizon: "12 days",
    signals: ["30-day spend trend", "subscription calendar", "recurring transfers"],
  },
  {
    id: "op-2",
    category: "travel",
    categoryEmoji: "✈️",
    categoryLabel: "Travel",
    prediction: "Flight prices to Istanbul will drop 15% next week — wait to book",
    detail: "Historical pricing for the Riyadh → Istanbul route shows a 14-day cyclic dip beginning next Tuesday. Current median is 1,180 SAR; projected low is 1,003 SAR.",
    confidence: 72,
    recommendedAction: "Set a price alert and book between Tuesday and Thursday next week.",
    actionLabel: "Set price alert",
    horizon: "next week",
    signals: ["60-day fare history", "seasonal demand", "competitor pricing", "RAMADAN calendar"],
  },
  {
    id: "op-3",
    category: "social",
    categoryEmoji: "🤝",
    categoryLabel: "Social",
    prediction: "Layla's posts suggest she's stressed — reach out?",
    detail: "Sentiment of Layla's last 7 posts is 38% more negative than her 90-day baseline. Posting frequency up 22%, sleep-window activity up 40%. No crisis keywords detected.",
    confidence: 65,
    recommendedAction: "Send a low-pressure 'thinking of you' message — avoid problem-solving language.",
    actionLabel: "Draft a check-in",
    horizon: "today",
    signals: ["post sentiment", "posting frequency", "sleep-window activity", "tone baseline"],
  },
  {
    id: "op-4",
    category: "government",
    categoryEmoji: "🏛️",
    categoryLabel: "Government",
    prediction: "This office has 60% delay rate — visit Tuesday morning",
    detail: "Arafat Municipality reports a 60% service-time SLA breach over the last 30 days. Tuesday 9-10 AM has the lowest observed queue (avg 14 min) vs 47 min on Sundays.",
    confidence: 91,
    recommendedAction: "Book a Tuesday 9 AM slot via the Absher integration, or arrive by 8:45 AM.",
    actionLabel: "Schedule visit",
    horizon: "Tuesday morning",
    signals: ["Cirkle Citizen Shield reputation data", "wait-time reports", "weekly patterns"],
  },
  {
    id: "op-5",
    category: "visa",
    categoryEmoji: "🛂",
    categoryLabel: "Visa",
    prediction: "Your visa expires during your planned trip — renew now",
    detail: "Your Saudi residency visa expires on Sep 3. Your planned Istanbul trip is Sep 1-8. Border exit will be blocked on the return leg. Renewal typically takes 5-7 business days.",
    confidence: 95,
    recommendedAction: "Start renewal today via Absher — you have 11 business days of margin.",
    actionLabel: "Start renewal",
    horizon: "now",
    signals: ["document expiry calendar", "travel itinerary", "renewal SLA history"],
  },
];

// Lightweight keyword router for free-form "Ask Oracle" questions.
function routeQuestion(q: string): OracleCategory {
  const s = q.toLowerCase();
  if (/(budget|money|spend|spending|salary|savings|invest|stock|crypto|s&p|rent)/.test(s)) return "financial";
  if (/(flight|fly|airline|istanbul|dubai|travel|trip|vacation|holiday)/.test(s)) return "travel";
  if (/(friend|layla|ahmed|relationship|family|reach out|call)/.test(s)) return "social";
  if (/(office|government|ministry|municipality|traffic|passport|absher|queue)/.test(s)) return "government";
  if (/(visa|residency|iqama|passport expiry|border)/.test(s)) return "visa";
  if (/(health|sleep|stress|doctor|clinic|symptom)/.test(s)) return "health";
  if (/(weather|rain|temperature|forecast)/.test(s)) return "weather";
  if (/(job|career|work|promotion|raise|salary review)/.test(s)) return "career";
  return "financial";
}

const TEMPLATES: Record<OracleCategory, (q: string) => Omit<OraclePrediction, "id" | "category">> = {
  financial: (q) => ({
    categoryEmoji: "💰",
    categoryLabel: "Financial",
    prediction: "Spending trajectory suggests a budget shortfall in 9-14 days",
    detail: `Analysis of "${q}" against your 30-day transaction history shows a 7% acceleration in discretionary spend. Three recurring charges renew in the next 10 days.`,
    confidence: 84,
    recommendedAction: "Pause non-essential subscriptions for 14 days and rerun the projection.",
    actionLabel: "Apply 14-day spending freeze",
    horizon: "9-14 days",
    signals: ["transaction velocity", "subscription calendar", "category mix shift"],
  }),
  travel: (q) => ({
    categoryEmoji: "✈️",
    categoryLabel: "Travel",
    prediction: "Best booking window for this route opens in 6-9 days",
    detail: `Routing "${q}" through 60-day fare history: prices currently sit at the 68th percentile. Median drop expected next week.`,
    confidence: 71,
    recommendedAction: "Set a price alert now and book between Tuesday–Thursday next week.",
    actionLabel: "Set price alert",
    horizon: "next week",
    signals: ["fare history", "demand cycle", "seasonal factors"],
  }),
  social: (q) => ({
    categoryEmoji: "🤝",
    categoryLabel: "Social",
    prediction: "A close contact's tone has shifted — a brief check-in is recommended",
    detail: `Question "${q}" matched sentiment baselines for one or more close contacts. Recent posts show a 30%+ sentiment dip vs. their 90-day average.`,
    confidence: 63,
    recommendedAction: "Send a short, low-pressure message — avoid problem-solving language.",
    actionLabel: "Draft a check-in",
    horizon: "today",
    signals: ["post sentiment baseline", "posting cadence", "sleep-window activity"],
  }),
  government: (q) => ({
    categoryEmoji: "🏛️",
    categoryLabel: "Government",
    prediction: "Target office shows 55-65% delay rate — early weekday visits are optimal",
    detail: `Cross-referencing "${q}" with Cirkle Citizen Shield reputation data: Tuesday 9-10 AM averages the shortest observed wait.`,
    confidence: 88,
    recommendedAction: "Book a Tuesday 9 AM slot via Absher or arrive by 8:45 AM.",
    actionLabel: "Schedule visit",
    horizon: "Tuesday morning",
    signals: ["office reputation data", "wait-time reports", "weekly patterns"],
  }),
  visa: (q) => ({
    categoryEmoji: "🛂",
    categoryLabel: "Visa",
    prediction: "Document expiry conflicts with a planned trip — renew ahead of travel",
    detail: `Question "${q}" was matched against your document vault. A renewal is recommended before your next cross-border trip.`,
    confidence: 92,
    recommendedAction: "Start renewal today via Absher — leave at least 5 business days of margin.",
    actionLabel: "Start renewal",
    horizon: "now",
    signals: ["document expiry calendar", "travel itinerary", "renewal SLA"],
  }),
  health: (q) => ({
    categoryEmoji: "❤️",
    categoryLabel: "Health",
    prediction: "Sleep + activity signals suggest elevated stress — schedule recovery time",
    detail: `Analysis of "${q}" against wearables + check-in notes: late-night screen time up 28%, resting heart rate up 4 bpm vs baseline.`,
    confidence: 68,
    recommendedAction: "Block 8 hours of sleep tonight and take a 15-minute walk tomorrow morning.",
    actionLabel: "Schedule recovery",
    horizon: "tonight",
    signals: ["sleep window", "resting HR baseline", "screen-time after 23:00"],
  }),
  weather: (q) => ({
    categoryEmoji: "🌤️",
    categoryLabel: "Weather",
    prediction: "Light rain likely Thursday morning — plan indoor activities",
    detail: `Forecast for "${q}": a 64% chance of light showers between 6-10 AM Thursday, clearing by afternoon.`,
    confidence: 76,
    recommendedAction: "Move outdoor plans to Friday morning if possible.",
    actionLabel: "Reschedule outdoor plans",
    horizon: "Thursday morning",
    signals: ["regional forecast", "satellite trends", "pressure systems"],
  }),
  career: (q) => ({
    categoryEmoji: "💼",
    categoryLabel: "Career",
    prediction: "Market demand for your skill set is trending up — refresh portfolio",
    detail: `Question "${q}" matched against local job postings: demand for your role is up 12% QoQ, but compensation band has shifted upward.`,
    confidence: 70,
    recommendedAction: "Update your portfolio this week and surface 2 recent wins to your manager.",
    actionLabel: "Refresh portfolio",
    horizon: "this week",
    signals: ["job posting volume", "compensation band", "skill-trend index"],
  }),
};

export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    predictions: SAMPLE_PREDICTIONS,
    summary: {
      total: SAMPLE_PREDICTIONS.length,
      highConfidence: SAMPLE_PREDICTIONS.filter((p) => p.confidence >= 80).length,
      averageConfidence: Math.round(
        SAMPLE_PREDICTIONS.reduce((s, p) => s + p.confidence, 0) / SAMPLE_PREDICTIONS.length,
      ),
    },
    modelInfo: {
      engine: "On-device Oracle (3.8 MB)",
      updateChannel: "Federated learning mesh",
      lastSync: "12 min ago",
      privacy: "All signals processed locally — no raw data leaves your device",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const question = typeof body?.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }
    if (question.length > 500) {
      return NextResponse.json(
        { error: "Question too long (max 500 chars)" },
        { status: 400 },
      );
    }

    const category = routeQuestion(question);
    const template = TEMPLATES[category](question);

    const prediction: OraclePrediction = {
      id: `op-${Date.now()}`,
      category,
      ...template,
    };

    return NextResponse.json({
      ok: true,
      prediction,
      echoedQuestion: question,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate prediction", details: String(err) },
      { status: 500 },
    );
  }
}
