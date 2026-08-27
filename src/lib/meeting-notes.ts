// @ts-nocheck
/**
 * Meeting Notes Service (E2)
 * --------------------------
 * AI-generated meeting notes for completed WebRTC calls.
 *
 * What this module does:
 *   • `generateMeetingNotes(callId, transcript, participants)` — runs the
 *     CIRKLE Brain AI provider chain to produce a summary, action items,
 *     decisions, and a who-said-what breakdown.
 *   • `extractActionItems(transcript)` — pulls out tasks ("X will do Y by Z").
 *   • `extractDecisions(transcript)` — pulls out commitments ("We agreed on…").
 *
 * Output shape is stored in the `CallMeetingNotes` Prisma model:
 *   { id, callId, summary, actionItems: JSON, decisions: JSON,
 *     participants: JSON, generatedAt }
 *
 * The route at /api/calls/[id]/notes handles GET (load) + POST (regenerate).
 * The notes overlay (`src/components/overlays/meeting-notes.tsx`) renders
 * the structured output with copy + share buttons.
 */

import { aiComplete, extractJSON } from "@/lib/ai";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  speaker: string;
  text: string;
  ts?: number;
}

export interface ActionItem {
  assignee?: string;
  task: string;
  deadline?: string;
}

export interface Decision {
  topic: string;
  decision: string;
}

export interface ParticipantInfo {
  id: string;
  displayName: string;
  spokeCount?: number;
}

export interface MeetingNotes {
  summary: string;
  actionItems: ActionItem[];
  decisions: Decision[];
  participants: ParticipantInfo[];
  provider?: string;
  generatedAt: string;
}

export interface GenerateNotesInput {
  callId: string;
  transcript: TranscriptSegment[];
  participants?: ParticipantInfo[];
  callDuration?: number; // seconds
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function flattenTranscript(transcript: TranscriptSegment[]): string {
  return transcript
    .map((s, i) => `[${i + 1}] ${s.speaker}: ${s.text}`)
    .join("\n");
}

function summarizeParticipants(transcript: TranscriptSegment[]): ParticipantInfo[] {
  const map = new Map<string, number>();
  for (const s of transcript) {
    map.set(s.speaker, (map.get(s.speaker) || 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({
    id: name,
    displayName: name,
    spokeCount: count,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMeetingNotes(
  input: GenerateNotesInput,
): Promise<MeetingNotes> {
  const transcript = input.transcript || [];
  const participants = input.participants && input.participants.length > 0
    ? input.participants
    : summarizeParticipants(transcript);

  if (transcript.length === 0) {
    return {
      summary: "No transcript available for this call.",
      actionItems: [],
      decisions: [],
      participants,
      provider: "fallback",
      generatedAt: new Date().toISOString(),
    };
  }

  const flat = flattenTranscript(transcript).slice(0, 8000); // cap to avoid token blowup
  const duration = input.callDuration ? `${input.callDuration}s` : "unknown";

  const sys = `You are CIRKLE's meeting notes generator.
Given a call transcript, produce structured notes that help the participants
remember what was discussed, what was decided, and who is doing what next.
Be CONCISE — summaries ≤3 sentences, action items ≤6, decisions ≤6.
Return VALID JSON only:
{
  "summary": "string",
  "actionItems": [{"assignee":"name","task":"do X","deadline":"Friday"}],
  "decisions": [{"topic":"shipping date","decision":"we ship on Friday"}]
}`;

  const usr = `Call duration: ${duration}
Participants: ${participants.map((p) => p.displayName).join(", ")}

Transcript:
${flat}

Return JSON now.`;

  let notes: MeetingNotes | null = null;

  try {
    const raw = await aiComplete(sys, usr, 1500, true); // use reasoning
    if (raw) {
      const parsed = extractJSON<{
        summary: string;
        actionItems: ActionItem[];
        decisions: Decision[];
      }>(raw);
      if (parsed) {
        notes = {
          summary: String(parsed.summary || "").slice(0, 1200),
          actionItems: Array.isArray(parsed.actionItems)
            ? parsed.actionItems.slice(0, 8).map((a) => ({
                assignee: a.assignee ? String(a.assignee).slice(0, 80) : undefined,
                task: String(a.task || "").slice(0, 280),
                deadline: a.deadline ? String(a.deadline).slice(0, 60) : undefined,
              }))
            : [],
          decisions: Array.isArray(parsed.decisions)
            ? parsed.decisions.slice(0, 8).map((d) => ({
                topic: String(d.topic || "").slice(0, 120),
                decision: String(d.decision || "").slice(0, 280),
              }))
            : [],
          participants,
          provider: "ai-chain",
          generatedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    logger?.error?.("[meeting-notes] AI chain failed:", err);
  }

  if (!notes) {
    // Heuristic fallback — extract action items + decisions via regex.
    const actionItems = extractActionItems(transcript);
    const decisions = extractDecisions(transcript);
    const summary = flat
      .split("\n")
      .slice(0, 3)
      .map((l) => l.replace(/^\[\d+\]\s*/, ""))
      .join(" ")
      .slice(0, 400);
    notes = {
      summary: summary || "Meeting notes unavailable — showing raw excerpt.",
      actionItems,
      decisions,
      participants,
      provider: "heuristic-fallback",
      generatedAt: new Date().toISOString(),
    };
  }

  return notes;
}

export function extractActionItems(transcript: TranscriptSegment[]): ActionItem[] {
  const items: ActionItem[] = [];
  const patterns = [
    /\b(?:I|we|let'?s|I'll|I will|I am going to)\s+(.{2,80})\s+by\s+([A-Za-z0-9 ,]+)[.?!]/gi,
    /\b([A-Z][a-z]+)\s+(?:will|should|needs? to|has to|is going to)\s+(.{2,100})[.?!]/gi,
    /\bTODO[:\s]+(.{2,100})/gi,
    /\bACTION\s+ITEM[:\s]+(.{2,100})/gi,
  ];
  for (const s of transcript) {
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(s.text)) !== null) {
        items.push({
          assignee: s.speaker,
          task: (m[1] || m[0] || "").trim().slice(0, 280),
          deadline: m[2]?.trim().slice(0, 60),
        });
        if (items.length >= 8) return items;
      }
    }
  }
  return items;
}

export function extractDecisions(transcript: TranscriptSegment[]): Decision[] {
  const out: Decision[] = [];
  const patterns = [
    /\b(?:we (?:agreed|decided|concluded|chose)|let'?s go with|the decision is)\s+(.{5,200})[.?!]/gi,
    /\b(?:decision|final choice|conclusion)[:\s]+(.{5,200})[.?!]/gi,
    /\b(?:approved|accepted|rejected)\s+(.{3,150})/gi,
  ];
  for (const s of transcript) {
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(s.text)) !== null) {
        out.push({
          topic: s.speaker,
          decision: (m[1] || m[0] || "").trim().slice(0, 280),
        });
        if (out.length >= 8) return out;
      }
    }
  }
  return out;
}
