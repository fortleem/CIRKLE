# TIER-B-VOICE-VIDEO — Voice/Video/Real-time features for CIRKLE Wasl + AI calls

**Agent**: full-stack-developer
**Task ID**: TIER-B-VOICE-VIDEO
**Date**: 2026-07-15

## Summary
Built 7 features (B1 WebRTC calls, B2 Voice messages, B9 Group video, B11 Voice rooms, E1 Call translation, E2 Meeting notes, E9 Voice cloning) across 6 lib modules, 12 API routes, and 6 overlays. All files are NEW — no existing files were modified.

## Constraint checklist
- ✅ Created ONLY new files (24 new files)
- ✅ Did NOT touch `src/app/page.tsx`, `src/lib/overlay-registry.ts`, `prisma/schema.prisma`, `src/screens/wasl-screen.tsx`, or any existing file
- ✅ `@ts-nocheck` at top of every file
- ✅ `"use client"` for overlays
- ✅ All fetches use relative paths, 8s timeout via `AbortController`
- ✅ Glass aesthetic, emerald accent, mobile responsive
- ✅ Full ARIA on every overlay
- ✅ WebRTC uses `navigator.mediaDevices.getUserMedia()`, permission-denial handled gracefully
- ✅ Voice recording uses `MediaRecorder` API, browser support detected
- ✅ Existing `voice-clone.tsx` overlay preserved → new file named `voice-clone-studio.tsx`
- ✅ Existing `/api/calls/route.ts` preserved → new endpoints under sub-paths (`initiate/`, `signal/`, `[id]/`, `group/`, `translate/`, `[id]/notes/`)

## Files created (24)

### Lib modules (6)
1. `src/lib/webrtc-service.ts` — `WebRTCCallSession` (1:1) + `GroupCallSession` (mesh SFU-style), `initiateCall/answerCall/endCall/toggleMute/toggleVideo/switchCamera/initiateGroupCall/joinGroupCall/getParticipantCount`. Google STUN. Mock signaling channel (documented prod requirement: socket.io mini-service on port 3003+).
2. `src/lib/voice-transcription.ts` — `transcribeAudio` (browser-side), `transcribeAudioServer` (server-side via `aiComplete` provider chain), `getVoiceMessageTranscript`, `isMediaRecorderSupported`, `pickRecordingMimeType`.
3. `src/lib/voice-rooms.ts` — `createRoom/joinRoom/leaveRoom/raiseHand/inviteToSpeaker/getRoom/listActiveRooms/endRoom` with graceful fallback to in-memory store when the VoiceRoom / VoiceRoomParticipant tables don't exist yet.
4. `src/lib/call-translation.ts` — `translateStream` (server-side single chunk via `aiComplete`), `createLiveTranslator` (client-side batching helper), `getSupportedLanguages` (15 languages with RTL flag).
5. `src/lib/meeting-notes.ts` — `generateMeetingNotes` (uses `aiComplete` with `useReasoning: true`), `extractActionItems` (regex heuristic), `extractDecisions` (regex heuristic), graceful fallback.
6. `src/lib/voice-cloning.ts` — `cloneVoice` (browser-side), `cloneVoiceServer` (server-side MOCK, documented ElevenLabs/Coqui/PlayHT outline), `speakWithClonedVoice`, `speakWithClonedVoiceServer` (returns a real silent WAV), `getVoiceCloneStatus`, `classifyMediaError`.

### API routes (12)
1. `src/app/api/calls/initiate/route.ts` — POST creates a CallSession (status=ringing)
2. `src/app/api/calls/signal/route.ts` — POST relays SDP/ICE (mock — returns 200 ack)
3. `src/app/api/calls/[id]/route.ts` — GET status, DELETE ends call
4. `src/app/api/calls/group/route.ts` — POST creates group call, GET lists participants
5. `src/app/api/calls/translate/route.ts` — POST translates a chunk
6. `src/app/api/calls/[id]/notes/route.ts` — GET loads notes, POST regenerates (calls `generateMeetingNotes`)
7. `src/app/api/messages/voice/route.ts` — POST uploads voice message, GET fetches transcript
8. `src/app/api/voice/transcribe/route.ts` — POST transcribes base64 audio via `transcribeAudioServer`
9. `src/app/api/voice/clone/route.ts` — POST uploads voice sample, GET fetches clone status
10. `src/app/api/voice/speak/route.ts` — POST synthesizes speech from text via cloned voice
11. `src/app/api/voice-rooms/route.ts` — POST creates room, GET lists active rooms
12. `src/app/api/voice-rooms/[id]/route.ts` — GET room details, POST action (join|leave|raise-hand|invite-to-speaker|end)

### Overlays (6)
1. `src/components/overlays/webrtc-call.tsx` (B1 + E1) — full-screen call UI with local/remote video, mute/video/switch-camera/translate toggles, call timer. Dispatches `circle:webrtc-call` event. Live translate subtitles panel with language picker.
2. `src/components/overlays/voice-message-recorder.tsx` (B2) — recording UI with waveform, pause/resume/cancel/send. AI transcription preview shown before sending. Dispatches `circle:voice-recorder`.
3. `src/components/overlays/group-video-call.tsx` (B9) — 2×N grid for up to 8 participants, active speaker highlight (host), mute-all (host), raise hand. Dispatches `circle:group-video-call`.
4. `src/components/overlays/voice-room.tsx` (B11) — Clubhouse-style. Browse view (list active rooms + create form), room view (stage speakers + audience list), raise hand / leave / end (host) controls. Dispatches `circle:voice-room`.
5. `src/components/overlays/meeting-notes.tsx` (E2) — summary card, action items list, decisions list, who-said-what grid. Copy / share / regenerate buttons. Dispatches `circle:meeting-notes`.
6. `src/components/overlays/voice-clone-studio.tsx` (E9) — 4-step wizard (intro → record 30s → training → ready/test). Test synthesis with playback. Settings toggle for "use cloned voice for outgoing voice messages". Dispatches `circle:voice-clone-studio` (renamed from `circle:voice-clone` to avoid clash with existing `voice-clone.tsx` overlay).

## Custom events dispatched (8)
| Event | Detail | Source |
|-------|--------|--------|
| `circle:webrtc-call` | `{ conversationId, type: "audio" \| "video", calleeId? }` | webrtc-call.tsx |
| `circle:voice-recorder` | `{ conversationId }` | voice-message-recorder.tsx |
| `circle:group-video-call` | `{ conversationId, type }` | group-video-call.tsx |
| `circle:voice-room` | `{ roomId? \| create: true, name?, topic? }` | voice-room.tsx |
| `circle:meeting-notes` | `{ callId }` | meeting-notes.tsx |
| `circle:voice-clone-studio` | `{ userId? }` | voice-clone-studio.tsx |

(Note: the task spec mentions `circle:voice-clone` for the E9 overlay, but since an existing `voice-clone.tsx` overlay already exists in the repo — which we cannot modify — we use `circle:voice-clone-studio` to avoid collision. The existing `voice-clone.tsx` keeps its existing event name.)

## Prisma models needed (5)

The task spec lists these 5 models. They are NOT yet in `prisma/schema.prisma` (we did not modify it). All API routes are resilient to schema drift — they detect the table's absence and fall back to in-memory storage or ephemeral responses with a `_warn` flag so the UI flow keeps working. Once `bun run db:push` is run after adding these models, the routes automatically start persisting.

```prisma
// 1. Extend the existing CallSession model:
//    (existing schema has caller/callee/type/status/startedAt?/endedAt?/createdAt)
//    Task spec asks for: conversationId, callerId, calleeId, duration.
//    Recommended migration: add `conversationId String?` and `duration Int?` columns.
//    The /api/calls/initiate + /api/calls/[id] routes already handle both shapes.

model VoiceMessage {
  id           String   @id @default(cuid())
  messageId    String
  audioBlobUrl String
  duration     Int
  transcript   String?
  language     String?
  createdAt    DateTime @default(now())
  @@index([messageId])
}

model VoiceRoom {
  id            String   @id @default(cuid())
  name          String
  hostId        String
  topic         String?
  status        String   @default("live") // live | ended
  speakerCount  Int      @default(1)
  audienceCount Int      @default(0)
  createdAt     DateTime @default(now())
  endedAt       DateTime?
  @@index([status])
}

model VoiceRoomParticipant {
  id          String   @id @default(cuid())
  roomId      String
  userId      String
  displayName  String
  avatarColor  String   @default("teal")
  role         String   @default("audience") // host | speaker | audience
  muted        Boolean  @default(true)
  handRaised   Boolean  @default(false)
  joinedAt     DateTime @default(now())
  @@index([roomId])
}

model CallMeetingNotes {
  id           String   @id @default(cuid())
  callId       String
  summary      String
  actionItems  String   @default("[]") // JSON array
  decisions    String   @default("[]") // JSON array
  participants String   @default("[]") // JSON array
  generatedAt  DateTime @default(now())
  @@index([callId])
}

model VoiceClone {
  id        String   @id @default(cuid())
  userId    String
  voiceId   String
  sampleUrl String
  status    String   @default("training") // training | ready | failed
  createdAt DateTime @default(now())
  @@index([userId])
}
```

Note: I added `VoiceRoomParticipant` (not in the original task spec list) because the voice-rooms service needs to track who's in each room — this is the standard pattern for Clubhouse-style rooms. The `VoiceRoom` model alone can't track participants without a join table.

## Overlay-registry entries needed (6)

These entries should be appended to `src/lib/overlay-registry.ts` (we did not modify the registry). All 6 are required for the OverlayBrowser + CommandPalette to surface the new features:

```typescript
{
  id: "webrtc-call",
  name: "WebRTC Call",
  description: "1:1 voice/video calls with live translate. WebRTC peer-to-peer with Google STUN.",
  emoji: "📞",
  category: "social",
  event: "circle:webrtc-call",
  keywords: ["call", "voice", "video", "webrtc", "p2p", "translate", "subtitles"],
},
{
  id: "voice-message-recorder",
  name: "Voice Message",
  description: "Record voice messages with AI transcription. Edit transcript before sending.",
  emoji: "🎙️",
  category: "social",
  event: "circle:voice-recorder",
  keywords: ["voice", "message", "audio", "transcribe", "record", "ai"],
},
{
  id: "group-video-call",
  name: "Group Video Call",
  description: "Up to 8 participants, active speaker highlight, mute-all, raise hand.",
  emoji: "📹",
  category: "social",
  event: "circle:group-video-call",
  keywords: ["group", "video", "call", "sfu", "mesh", "multi-party", "conference"],
},
{
  id: "voice-room",
  name: "Voice Rooms",
  description: "Clubhouse-style live audio rooms. Stage + audience, raise hand, invite to speak.",
  emoji: "📻",
  category: "social",
  event: "circle:voice-room",
  keywords: ["voice", "room", "clubhouse", "stage", "audience", "live", "audio"],
},
{
  id: "meeting-notes",
  name: "AI Meeting Notes",
  description: "Auto-generated call summary, action items, decisions, who-said-what.",
  emoji: "📝",
  category: "ai",
  event: "circle:meeting-notes",
  keywords: ["meeting", "notes", "summary", "action items", "decisions", "transcript", "ai"],
},
{
  id: "voice-clone-studio",
  name: "Voice Clone Studio",
  description: "Clone your voice in 30 seconds. Test synthesis + use for outgoing voice messages.",
  emoji: "🎭",
  category: "ai",
  event: "circle:voice-clone-studio",
  keywords: ["voice", "clone", "tts", "synthesis", "elevenlabs", "coqui", "playht"],
},
```

## Lint result

```
$ eslint .
✖ 2 problems (0 errors, 2 warnings)
  0 errors and 2 warnings potentially fixable with the `--fix` option.
```

The 2 remaining warnings are in pre-existing files I did NOT touch:
- `src/components/overlays/message-search.tsx:266:27` — unused `react/no-danger` disable
- `src/components/overlays/saved-messages.tsx:76:15` — unused `react-hooks/exhaustive-deps` disable

All 24 newly-created files pass lint with **0 errors and 0 warnings**.

## Production notes

1. **WebRTC signaling** — `src/lib/webrtc-service.ts` uses a `MockSignalingChannel`. Production must replace with a real socket.io mini-service (existing `mini-services/chat-service` on port 3003 already wires this pattern). The browser-side API is intentionally identical to a socket.io client's `.on()/emit()` surface so the swap is a one-line change.

2. **Group calls SFU** — `GroupCallSession` uses a mesh network (works for ≤8 participants). Production with >8 participants needs a real SFU (mediasoup / janus / livekit). The class's API surface is shaped to match an SFU's `joinRoom/leaveRoom` pattern.

3. **Voice cloning** — `src/lib/voice-cloning.ts` `cloneVoiceServer()` returns a deterministic mock voiceId. Real implementation must call ElevenLabs / Coqui / PlayHT. The exact production outline (ElevenLabs API shape) is documented in the function's header comment.

4. **Call translation** — `src/lib/call-translation.ts` translates server-side via `aiComplete()`. For real-time low-latency, the overlay's `LiveTranslator` batches utterances (1.2s gap → flush). On-device ONNX NLLB-200 (per `src/lib/translation-service.ts`) is the privacy-default for future work.

5. **DB schema** — Once the 5 new Prisma models are added to `prisma/schema.prisma` and `bun run db:push` is run, all API routes automatically start persisting (they detect `db.voiceRoom`/`db.voiceMessage`/etc. presence via `hasDB()` checks). No code changes needed.

6. **Page.tsx wiring** — Each overlay needs to be:
   - dynamically imported with `ssr: false`
   - state-backed by a `useState(false)`
   - subscribed to its event via `window.addEventListener`
   - rendered at the page level

   This wiring is intentionally NOT done by this task per the "do not modify existing files" rule. It's the next step for whoever picks up the integration.
