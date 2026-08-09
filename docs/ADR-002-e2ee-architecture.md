# ADR-002: End-to-End Encryption Architecture for Wasl (Chat) & Family Vault

| Field | Value |
|---|---|
| **ADR Number** | 002 |
| **Title** | E2EE Architecture — Matrix Olm/Megolm via libolm WASM vs Signal vs WebRTC DTLS-SRTP vs custom AES-256-GCM |
| **Status** | PROPOSED (awaiting CTO approval) |
| **Date** | 2026-08-09 |
| **Decision Owner** | CIRKLE Architecture Council |
| **Supersedes** | — |
| **Superseded by** | — |
| **Blueprint reference** | CIRCLE BLUEPRINT v12.0 / v13, §3.4 (Federated Chat — Matrix Synapse + Olm/Megolm), §15 (Local Mesh), §26.6 (Family Vault), §28 (Privacy) |
| **Related ADRs** | ADR-001 (Platform Strategy — Web-first PWA), ADR-003 (On-Device AI), planned ADR-004 (Native Wrapper for Mesh/Biometrics) |

---

## 1. Context

CIRKLE's privacy covenant (blueprint §1, §28) requires that **the server operator
cannot read user messages, photos, or vault contents** — even under subpoena,
server compromise, or insider threat. The CIRCLE BLUEPRINT v12.0 §3.4 mandates
**Matrix Synapse + Olm/Megolm** for chat E2EE, matching the design used by
Element/Matrix, WhatsApp-style ratchets, and Signal.

The **existing codebase** at HEAD has *partial* encryption but **not real E2EE**:

| Existing module | What it does | Gap vs. real E2EE |
|---|---|---|
| `src/lib/crypto.ts` | AES-256-GCM at rest for OAuth tokens + webhook secrets | Server-side key (`CIRKLE_ENCRYPTION_KEY` env var). Server **can** decrypt. This is envelope encryption, **not** E2EE. |
| `src/lib/family-vault.ts` | Client-side AES-256-GCM with PBKDF2-derived family passphrase | ✅ Real E2EE for vault items. But: no per-message ratchet, no multi-device, no key verification, no forward secrecy. |
| `src/app/api/conversations/*` | Plaintext chat storage in SQLite via Prisma | ❌ Server reads every message. No encryption at all. |
| `src/lib/call-manager.ts` | WebRTC with DTLS-SRTP for voice/video calls | ✅ Real E2EE for calls (DTLS-SRTP is end-to-end between the two peer devices). Audio/video only. |

So today: **calls are E2EE, vault items are E2EE, but chat messages are not.**
This ADR closes that gap and unifies the chat E2EE story with the blueprint.

The decision must answer:

1. **Which protocol?** Matrix Olm/Megolm (blueprint), Signal Protocol (libsignal),
   WebRTC DTLS-SRTP (calls only), or roll-our-own AES-256-GCM (what we have)?
2. **Where do device keys live?** localStorage (XSS-vulnerable), IndexedDB
   (current pattern), or native keystore (requires ADR-004 wrapper)?
3. **How do users verify each other?** QR code, SAS (short authentication
   string), safety numbers, or trust-on-first-use?
4. **What gets stored in the database?** Ciphertext only? Metadata?
5. **What does the server know?** Sender, recipient, timestamp, message ID —
   but not content. Is that acceptable?
6. **How do push notifications work without decrypting?** Encrypted push
   payload vs. "you have a new message" generic notification?
7. **What happens when a user loses their device?** Account recovery via
   recovery key, social recovery, or "messages are gone forever"?

This ADR is **scoped to chat E2EE**. Vault E2EE is already correct (just needs
the same multi-device + key-verification story layered on). Call E2EE is
already correct (DTLS-SRTP). Mesh E2EE is deferred to ADR-004.

---

## 2. Decision Drivers

1. **Server-blindness covenant** — the operator must be cryptographically
   unable to read user content. This rules out any design where the server
   holds a decryption key (rules out Option D — custom AES-256-GCM with
   server-side key).
2. **Multi-device support** — users have 2.4 devices on average (phone +
   laptop + tablet). The protocol must let a user read their own history on
   a new device without re-sending every message.
3. **Forward secrecy + post-compromise security** — if a device key leaks,
   past messages must remain unreadable (forward secrecy) and future messages
   must self-heal (post-compromise security / ratcheting).
4. **Group scalability** — CIRKLE groups (The Circle §11) can have 200+ members.
   The protocol must encrypt a group message once, not N times.
5. **Browser viability** — per ADR-001, the primary client is a Next.js PWA
   running in a browser. The crypto must work in WebAssembly + Web Crypto
   (SubtleCrypto). Native-only protocols are disqualified.
6. **Flutter future-proofing** — ADR-004 may approve a thin native wrapper;
   the protocol must have a Flutter path so we don't paint ourselves into a
   corner.
7. **Disappearing messages** — blueprint §28.3 requires "messages that
   self-destruct after N hours." Must be enforceable client-side.
8. **Offline operation** — per blueprint §15 + ADR-001 §15, CIRKLE must work
   without internet. E2EE handshake must not require round-trips to a central
   server for every message.
9. **Audit maturity** — the protocol must have at least one independent
   third-party security audit. We are not cryptographers; we do not roll
   our own.
10. **Maintenance burden** — CIRKLE is a "zero-cost" foundation with a small
    team. The protocol must have a maintained reference implementation we
    can consume, not one we maintain ourselves.

---

## 3. Considered Options

### Option A — Matrix Olm/Megolm via libolm WASM (blueprint's choice)

**Stack:** Olm (1:1 X3DH + Double Ratchet, like Signal) for direct messages;
Megolm (sender-key ratchet, one encrypt per group message) for group chats.
`libolm` is the C reference implementation from Matrix.org, compiled to
WebAssembly via Emscripten. The web client loads `libolm.wasm` (~150 KB) and
calls it through a thin JS wrapper (`@matrix-org/olm` npm package).

**Federation:** Optionally deploy Matrix Synapse as the homeserver so CIRKLE
users can federate with other Matrix users. **Or** — keep our existing
Socket.IO transport and use Olm/Megolm only as the crypto layer (libolm is
transport-agnostic). This ADR recommends the latter for Year-1; federation
becomes a separate future ADR.

**How it works:**

- Each **device** generates an Ed25519 identity key + Curve25519 one-time keys
  on first launch. These are stored client-side (IndexedDB).
- To send a 1:1 message, the sender fetches the recipient's published identity
  key + one-time prekey from the server, performs X3DH key agreement, then
  ratchets with Double Ratchet (Double Ratchet = forward secrecy + PCS).
- For group messages, the sender creates a Megolm session (a symmetric
  ratchet key), encrypts the message once with Megolm, and distributes the
  Megolm session key to each recipient device via Olm (1:1) channels.
- The server only sees ciphertext + envelope metadata.

**Pros:**
- **Blueprint-aligned** — §3.4 explicitly specifies this stack.
- **Audited** — Olm/Megolm was independently audited by NCC Group (2016) and
  Quarkslab (2024). Findings were addressed.
- **Battle-tested** — used by Element, the German military (BwMessenger),
  the French government (Tchap), and ~100M Matrix users.
- **Multi-device** — designed for it. Each device has its own identity key;
  a user authorizes a new device by signing its key with an existing device.
- **Group scalability** — Megolm encrypts once per message, not N times.
- **Disappearing messages** — Matrix spec includes `m.room.retention`;
  client-side enforcement in our wrapper.
- **Offline** — Olm sessions are stateful but resumable; messages queue
  locally and flush when online.
- **Web support** — `@matrix-org/olm` is the official WASM build. Element Web
  uses it in production.
- **Flutter support** — `matrix_sdk` (Rust) Flutter bindings exist via
  `matrix_dart_sdk` and the official `matrix-rust-sdk` FFI. Future-proof.
- **Forward secrecy + PCS** — Double Ratchet on Olm sessions.
- **Recovery** — Matrix "cross-signing" lets a user authorise a new device
  from any surviving device; if all devices are lost, the user can use a
  recovery key (recovery passphrase → decrypts secret-storage). Messages
  received *after* recovery are readable; messages from the lost window are
  not — this is the correct security trade-off.
- **Transport-agnostic** — we don't have to deploy Synapse today; we can run
  libolm over our existing Socket.IO. Federation deferred.

**Cons:**
- **Megolm is *not* forward-secret against the sender.** If a sender's
  Megolm session key leaks, all messages sent *by that sender* in that
  session can be decrypted. Mitigation: rotate Megolm sessions every 100
  messages or every 7 days (configurable; matches Element default).
- **libolm is in maintenance mode** (Matrix.org is migrating to
  `vodozemac` Rust implementation). libolm is still supported but new
  features land in vodozemac first. We should plan a vodozemac-WASM migration
  in ~12-18 months. The wire format is the same, so this is a library swap,
  not a protocol migration.
- **WASM load cost** — `libolm.wasm` is ~150 KB; first-message latency
  increases by ~80-120ms on a mid-range phone while the WASM instantiates.
  Mitigation: preload on app boot.
- **Key verification UX** — users must verify each other's identity keys
  (QR or SAS) or accept trust-on-first-use. If they skip, a
  man-in-the-middle attack is possible. We must make verification
  frictionless (QR-scan on first call).
- **Server still sees metadata** — sender, recipient, timestamp, message ID,
  group membership. This is unavoidable in any messaging system. We
  minimise by using opaque device IDs (not usernames) on the wire wherever
  possible (see §5).

---

### Option B — Signal Protocol via libsignal

**Stack:** `libsignal` (Rust, official from Signal Foundation) compiled to
WASM for web. Same X3DH + Double Ratchet as Olm but no Megolm — group
messages are encrypted once per recipient device (sender-keys variant, the
"Sender Keys" abstraction introduced in libsignal-protocol-java).

**Pros:**
- **Most-audited protocol in existence** — Signal has had 5+ independent
  audits (Cure53, NCC Group, Trail of Bits). Zero critical findings.
- **Forward secrecy + PCS** on both 1:1 and group paths (Sender Keys
  ratchet per group).
- **Multi-device** — designed for it.
- **Disappearing messages** — first-class (this is the Signal trademark
  feature).
- **WASM build available** — `@signalapp/libsignal-client` ships a
  WASM target (used by Signal-Desktop).
- **Rust core** — easier FFI for future Flutter wrapper than libolm's C.

**Cons:**
- **Blueprint divergence** — §3.4 specifies Matrix/Olm. Choosing Signal
  requires an ADR to override the blueprint.
- **No federation** — Signal protocol has no federation story. CIRKLE users
  could never talk to Matrix/Element users. If federation is later desired
  (blueprint §3.5 hints at it), we'd have to re-implement Olm anyway.
- **Group encryption cost** — Signal Sender Keys encrypt once per recipient
  *device*, not once per message. For a 200-member group where each member
  has 2 devices, that's 400 encryptions per message vs. Megolm's 1.
  Measurable CPU + battery cost on low-end Android.
- **Maintenance burden** — `libsignal` is licensed GPLv3 (with a special
  exception for the Signal apps). Embedding it in a proprietary-ish CIRKLE
  client requires careful legal review; the WASM artifact may also be
  subject to GPLv3 viral clauses if we modify it. Matrix libolm is Apache-2.0.
- **No "cross-signing" equivalent** — Signal's multi-device story requires
  the primary device to be online to provision a new device ("linked
  device" model). If the primary is lost, all linked devices lose the
  ability to provision new ones until re-registration. Matrix cross-signing
  is more flexible.
- **Server metadata** — Signal minimises server metadata via sealed sender
  (sender identity hidden from server). Olm does not have this by default;
  however, sealed sender is a transport-layer feature, not a protocol one,
  and we can implement it independently on either stack.

---

### Option C — WebRTC DTLS-SRTP (calls only)

**Stack:** WebRTC's mandatory DTLS-SRTP layer. The two peers do a DTLS
handshake over the WebRTC data channel / media channel; all audio, video,
and data-channel bytes are then encrypted with SRTP using keys derived
from the DTLS handshake. The signaling server only sees the SDP offer /
answer (which contains the DTLS fingerprint) — not the media.

**Pros:**
- **Already deployed** — `src/lib/call-manager.ts` uses this. Zero work.
- **Browser-native** — every browser ships WebRTC with DTLS-SRTP enabled
  by default. No WASM.
- **P2P** — once the DTLS handshake completes, the media flows directly
  between the two peers (or via TURN if NAT blocks P2P). The server is
  not in the media path.
- **Forward secrecy** — DTLS 1.2/1.3 with ECDHE provides forward secrecy
  for the session keys.

**Cons:**
- **Real-time media only.** DTLS-SRTP encrypts RTP packets; it does not
  encrypt "messages" in the chat sense. We could tunnel chat over a
  WebRTC data channel, but:
  - The data channel requires the call to be **active** — you cannot send
    an async chat message via data channel while the recipient is offline.
  - WebRTC connections are heavyweight (ICE, DTLS, STUN, TURN). One
    connection per pair of online users is wasteful.
  - No group story — data channels are 1:1; group chat would need a mesh
    of N² connections.
- **No persistence** — DTLS-SRTP sessions are ephemeral. There is no
  concept of message history, search, or sync across devices.
- **No disappearing messages** — N/A.
- **Recovery** — N/A (no history to recover).

**Verdict:** ✅ **Keep for calls** (already deployed, correct). ❌ **Reject
for chat.** This option is documented for completeness; the call layer
remains on DTLS-SRTP per `call-manager.ts` and is not affected by this ADR.

---

### Option D — Custom AES-256-GCM with server-side key (what we have now)

**Stack:** `src/lib/crypto.ts` — AES-256-GCM with the key read from
`CIRKLE_ENCRYPTION_KEY` env var (server-side). The server encrypts on
write, decrypts on read. Used today for OAuth tokens + webhook secrets.

There is a **separate** client-side pattern in `family-vault.ts` —
AES-256-GCM with the key derived client-side from a family passphrase via
PBKDF2 (200k iterations). That pattern *is* real E2EE for the vault scope,
but it lacks multi-device, key verification, forward secrecy, and ratcheting.

**Pros:**
- **Already shipped.** Zero work.
- **Simple** — no protocol design, no audit needed, no key distribution.
- **Server-side search** — because the server has the key, server-side
  full-text search of message content is trivially possible.

**Cons:**
- **NOT E2EE.** The server can decrypt everything. A subpoena, a server
  compromise, a malicious insider — all read every message. This violates
  the blueprint §1 / §28 privacy covenant.
- **No forward secrecy.** One key leak → entire history compromised.
- **No multi-device key rotation.**
- **No key verification.** Users cannot detect a MITM.
- **No disappearing messages** (server has the key forever).
- **Server-side search is a feature we explicitly don't want** — per
  blueprint §28, message search must be client-side only.

**Verdict:** ❌ **Reject for chat.** Keep `src/lib/crypto.ts` for what it's
good at (envelope encryption of *server-owned* secrets like OAuth tokens
where the server legitimately needs to read them). Do not extend it to
user content. The vault pattern (`family-vault.ts`) stays as-is until the
Olm/Megolm layer subsumes it — at which point vault keys are distributed
via Olm to family-member devices and the passphrase layer becomes optional.

---

## 4. Comparison Matrix

| Criterion | A — Olm/Megolm WASM | B — Signal libsignal | C — WebRTC DTLS-SRTP | D — Custom AES-256-GCM |
|---|---|---|---|---|
| Server-blind (real E2EE) | ✅ | ✅ | ✅ (calls only) | ❌ server has key |
| Forward secrecy (1:1) | ✅ Double Ratchet | ✅ Double Ratchet | ✅ DTLS-ECDHE | ❌ |
| Forward secrecy (group) | ⚠️ session rotation | ✅ Sender Keys | N/A | ❌ |
| Post-compromise security | ✅ | ✅ | N/A | ❌ |
| Multi-device | ✅ cross-signing | ⚠️ primary must be online | N/A | ❌ |
| Group scalability (200+ members) | ✅ 1 encrypt/msg | ⚠️ N encrypts/msg | ❌ N² connections | ✅ (server-side) |
| Disappearing messages | ✅ via wrapper | ✅ first-class | N/A | ❌ |
| Offline async messaging | ✅ | ✅ | ❌ requires active call | ✅ |
| Web (WASM) support | ✅ official | ✅ official | ✅ native | ✅ native |
| Flutter support | ✅ matrix-rust-sdk FFI | ✅ libsignal Rust | ✅ flutter_webrtc | ✅ |
| Maturity / audits | ✅ NCC + Quarkslab | ✅ 5+ audits | ✅ IETF standard | ❌ none |
| License | Apache-2.0 | GPLv3 (legal review) | BSD | n/a |
| Federation future-proof | ✅ Matrix native | ❌ no federation | ❌ | ❌ |
| Maintenance burden | Low (consume libolm) | Medium (GPL compliance) | None (browser) | Low |
| Blueprint alignment | ✅ §3.4 exact | ❌ diverges | ✅ §7 calls | ❌ |
| Recovery story | ✅ recovery key + cross-signing | ⚠️ re-register, lose history | N/A | ✅ server can reset |
| Push without decrypting | ✅ encrypted push payload | ✅ encrypted push payload | N/A | ⚠️ (server can peek) |

---

## 5. Architectural Decisions (the answers)

### 5.1 Key storage — where do device keys live?

| Key type | Web (PWA) | Flutter (future) | Reasoning |
|---|---|---|---|
| Olm identity key (Ed25519 + Curve25519) | IndexedDB (encrypted-at-rest with a passphrase-derived KEK) | iOS Keychain / Android Keystore | IndexedDB is the only persistent web store with multi-MB capacity. localStorage is too small (5 MB cap) and XSS-vulnerable. IndexedDB with a passphrase-derived KEK (PBKDF2 200k via Web Crypto) is the best the browser can do today. |
| Olm session state | IndexedDB (same store) | Same — native keystore | Session state is high-volume (one row per message); must be queryable. IndexedDB indexes by session ID. |
| Megolm session keys | IndexedDB | Same | Same rationale. |
| Recovery key (decrypts cross-signing private key) | **User-written-down 48-char base58 string** — never stored server-side. Optionally encrypted with passphrase and stored in Matrix secret-storage. | Same | The recovery key is the user's last-resort. If we store it server-side, we've broken E2EE. If we don't store it at all, the user loses everything on device loss. Compromise: user stores it (paper, password manager); we offer an *encrypted* copy in secret-storage keyed by their passphrase. |
| Push key (VAPID) | IndexedDB | Same | Per-device, low-sensitivity. |

**Why not native keystore on web?** Browsers do not expose a per-origin
hardware keystore. WebAuthn can store keys in the platform authenticator
(TPM / Secure Enclave), but WebAuthn keys are non-extractable and
signature-only — they cannot be used for Olm's Curve25519 ECDH. So we are
stuck with IndexedDB + a passphrase-derived KEK on web. This is the same
compromise Element Web, ProtonMail, and Tutanota all make.

**Why not localStorage?** Two reasons: (1) 5 MB cap is too small for Olm
session state in active chats; (2) any XSS can exfiltrate localStorage
trivially. IndexedDB with a passphrase-derived KEK limits XSS blast radius
to "messages visible during the active session" — still bad, but better
than "all historical keys forever."

**Future ADR-004 path:** if/when a Capacitor wrapper ships, the Olm
identity key moves to iOS Keychain / Android Keystore (non-extractable)
and the IndexedDB KEK layer is removed for native builds. The wire
protocol stays the same.

### 5.2 Key verification — how do users verify each other?

**Primary: QR code scan.** Each device encodes its Ed25519 identity key
fingerprint + Curve25519 key into a QR. Users scan each other's QR codes
in person (or via screen-share on a video call). On match, the device is
marked verified; future key changes trigger a scary red banner.

**Secondary: SAS (Short Authentication String).** When a QR scan isn't
possible (remote verification), users see a 6-digit decimal code (or
emoji set) derived from the X3DH handshake. They read it aloud on a
voice call ("is your code 4-7-2-9-1-3?"). On match, the device is marked
verified. This matches Signal's safety-number UX.

**Tertiary: trust-on-first-use (TOFU) with warning.** First message to
an unverified device is allowed but shows a subtle "unverified — tap to
verify" banner. After 7 days of unverified communication without
verification, the banner escalates to orange. After 30 days, red.

**Cross-signing user-trust:** a user verifies their *own* new device by
having an existing verified device sign the new device's identity key.
No QR needed for self-provisioning — matches Matrix "cross-signing" UX.

**Implementation:** reuse `src/components/overlays/device-verify.tsx`
which already exists and currently does a ZK attestation dance; extend
it to also display the Olm identity-key fingerprint + QR.

### 5.3 Message format — what gets stored in the database?

**Client-side (IndexedDB, the user's own device):**
```
messageId (uuid)
senderDeviceId (opaque)
recipientDeviceIds[] (opaque)
ciphertext (base64, Megolm-encrypted)
megolmSessionId
messageIndex (Megolm ratchet counter)
sentAt (ISO 8601)
receivedAt (ISO 8601)
decryptedAt (nullable; null until local decrypt succeeds)
plaintextCache (nullable; only populated after decrypt, encrypted-at-rest
                with the IndexedDB KEK so a stolen IndexedDB file alone
                is not enough)
```

**Server-side (Prisma, our DB — the homeserver or our Socket.IO relay):**
```
messageId (uuid)                    — opaque, no semantic content
senderDeviceId (opaque hash)        — NOT the username; hash(deviceId + userId)
recipientUserIds[] (hashed)         — hash(userId) so server can route
                                     but cannot enumerate easily
groupId (opaque, only for group msgs)
ciphertextBlob (base64)             — Megolm ciphertext, opaque to server
megolmSessionId (opaque)
messageIndex (integer)
sentAt (timestamp)                  — server cannot avoid seeing this
deliveredAt (timestamp, nullable)
expiresAt (timestamp, nullable)     — for disappearing messages; server
                                     deletes the row at this time
                                     (defence-in-depth, not the only
                                     deletion mechanism)
```

**What the server explicitly does NOT store:**
- Plaintext (obviously)
- Megolm session keys (these live only on devices)
- Olm session keys (same)
- Sender username in plaintext (we hash it; server uses a separate
  `users` table mapping `userId → hashedUserId` for routing)
- Subject line / preview (no "subject" field at all on the wire)
- Reply-chain context (server sees `inReplyTo` = opaque messageId only)

### 5.4 Server metadata — what does the server know?

The server **must** know (otherwise it cannot route messages):

| Field | Why the server needs it | Mitigation |
|---|---|---|
| Sender device ID (hashed) | Spam/abuse rate-limiting per device | Hash with a server-side pepper so a DB leak doesn't deanonymize users |
| Recipient user ID (hashed) | Routing | Same |
| Group ID (opaque) | Group fan-out | Random UUID; group name is encrypted with Megolm and stored as ciphertext |
| Sent timestamp | Ordering, expiry | Truncate to the minute to reduce timing-correlation precision |
| Message size (bytes) | Bandwidth accounting, abuse detection | Truncate to bucket (1KB / 10KB / 100KB / 1MB) |
| Message ID (uuid) | Deduplication, delivery receipts | Random UUID, no semantic content |

The server **does not** know:
- Message content (Megolm-encrypted)
- Sender/recipient real name or username (only hashed IDs)
- Group name or membership count (only opaque group ID)
- Whether a message is a reply (only `inReplyTo` = messageId)
- Whether a message contains media vs. text (ciphertext is opaque)

This matches the blueprint §28 "minimal metadata" requirement and is
consistent with what Matrix homeservers see today.

### 5.5 Push notifications — how to notify without decrypting?

**Problem:** push notifications (Web Push API per ADR-001 §5, or APNs/FCM
via the future native wrapper) are delivered by a push provider (Apple,
Google, Mozilla) that we do not control. If we put the plaintext in the
push payload, the push provider can read it. If we put nothing, the user
gets "you have a new message" with no context — bad UX.

**Decision: encrypted push payload via the Olm session key.**

- When the server receives a message for an offline user, it generates a
  push notification containing:
  ```
  {
    "v": 1,
    "deviceId": "<target device opaque id>",
    "encPayload": "<base64 — AES-256-GCM, key derived from the
                    Olm session key for this device>",
    "sentAt": "<timestamp>"
  }
  ```
- `encPayload` is encrypted with a key derived from the Olm session key
  shared between the sending device and the receiving device. The server
  does not have this key — it just relays the encrypted blob from sender
  to push provider.
- The push provider delivers `encPayload` to the device.
- The device wakes up, derives the Olm session key from local state,
  decrypts `encPayload`, and displays: `"Layla: مرحبا 👋"` (the plaintext
  sender display name + a 80-char preview).
- **Optional high-privacy mode:** user can set "show only 'New message'"
  in which case `encPayload` is omitted and the device shows the generic
  notification.

This matches Element's push design and works on Web Push, APNs, and FCM.

**Why not just push a "wake up and fetch" signal?** Because that requires
the device to open a connection to the server to fetch the message, which
adds 200-500ms of latency and uses more battery than decrypting a small
payload locally.

---

## 6. Recommendation

**ADOPT Option A — Matrix Olm/Megolm via `libolm` WASM** as the E2EE
protocol for CIRKLE chat (Wasl §4), with the following clarifications:

1. **Year-1 transport:** run Olm/Megolm over the **existing Socket.IO
   relay** (no Synapse deployment required). The server only needs to
   (a) accept opaque ciphertext blobs, (b) fan out to recipient devices,
   (c) store-and-forward for offline users, (d) deliver encrypted push.
   The Socket.IO server becomes a "dumb relay."

2. **Future federation (deferred):** if/when CIRKLE wants to federate with
   Matrix.org / Element users, deploy Synapse as a separate homeserver and
   have the client connect to it via the standard Matrix Client-Server API
   (libolm is the same). This is a separate ADR.

3. **Flutter path:** when ADR-004 approves a native wrapper (or a future
   Flutter client ships), use `matrix-rust-sdk` which embeds
   `vodozemac` (the Rust successor to libolm, wire-compatible). The same
   Olm/Megolm sessions work on both web and native — no protocol migration.

4. **Subsume Family Vault:** once Olm/Megolm is live for chat, extend it
   to vault items. Today `family-vault.ts` uses AES-256-GCM with a
   passphrase-derived key; the new design encrypts the vault-item
   symmetric key with Megolm and distributes it to family-member devices
   via Olm. The passphrase layer becomes optional (recovery-only). This
   unifies the E2EE story.

5. **Keep DTLS-SRTP for calls:** `call-manager.ts` is unchanged. WebRTC
   calls remain E2EE via the browser's native DTLS-SRTP; the Olm layer is
   not used for real-time media.

6. **Keep `src/lib/crypto.ts` for server-owned secrets:** OAuth tokens,
   webhook secrets, OIDC RSA keys — these are *envelope encryption* where
   the server legitimately needs to read. Do not conflate this with E2EE.

### Rationale

1. **Blueprint alignment.** §3.4 specifies Matrix/Olm. Choosing it means
   CIRKLE matches the blueprint without override.

2. **Audit maturity without doing the audit ourselves.** Olm/Megolm has
   two independent third-party audits (NCC Group 2016, Quarkslab 2024);
   Signal has more, but Olm's are sufficient. We cannot afford a
   from-scratch audit; consuming an audited library is the only safe
   path.

3. **Group scalability.** Megolm's "encrypt once per message" model is
   essential for CIRKLE groups (200+ members). Signal Sender Keys'
   "encrypt per recipient device" model would burn battery on low-end
   Android in large groups.

4. **Federation optionality.** Even if we never federate, having the
   option (via a Synapse deployment in a future ADR) is a strategic
   asset. Choosing Signal closes that door permanently.

5. **Apache-2.0 license.** libolm is Apache-2.0; we can embed it without
   legal review. libsignal is GPLv3 with a narrow exception — would
   require general counsel sign-off and constrains future licensing of
   the CIRKLE client.

6. **Cross-signing > linked-device.** Matrix's cross-signing model (any
   verified device can authorise a new device) is more user-friendly than
   Signal's linked-device model (primary must be online). For a super-app
   where users may switch between phone, tablet, and laptop constantly,
   this matters.

7. **Existing `device-verify.tsx` overlay.** The UI for key verification
   (QR + SAS) can extend the existing overlay rather than being built
   fresh.

### Conditions / Acceptance Criteria

This recommendation is contingent on:

1. **CTO sign-off** on accepting the **Megolm sender-forward-secrecy
   trade-off** (Megolm sessions must be rotated every 100 messages / 7
   days; this is a config setting, not a code change).
2. **CTO sign-off** on the **server-metadata exposure list** in §5.4
   (specifically: server sees hashed sender/recipient IDs, timestamps
   truncated to the minute, message-size buckets, and opaque group IDs).
3. **CTO sign-off** on the **recovery trade-off**: if a user loses all
   devices and has no recovery key, messages received during the device-less
   window are **permanently unreadable**. This is correct cryptography
   but a hard UX pill.
4. **CTO sign-off** on **deferred Synapse federation** — Year-1 ships
   Olm/Megolm over Socket.IO; Synapse is a separate future ADR.
5. **Security review** of the IndexedDB KEK design by an external
   consultant before production launch (estimated 2 days of consulting
   time, ~$5k).
6. **Pentest** of the full Olm/Megolm integration before Egypt launch
   (estimated 1 week, ~$20k).

### Known Limitations Accepted by This Decision

| Limitation | Impact | Mitigation |
|---|---|---|
| Megolm is not sender-forward-secret | If a sender's Megolm session key leaks, all messages *they sent* in that session are decryptable | Rotate Megolm sessions every 100 msgs / 7 days; rotate immediately on device logout |
| IndexedDB KEK is passphrase-derived; XSS still exfiltrates plaintext during an active session | Stolen device + known passphrase → history readable | Future ADR-004 native wrapper moves keys to Keychain/Keystore (non-extractable) |
| Server sees hashed sender/recipient IDs + bucketed timestamps | Traffic-analysis attacks can partially deanonymize | Mixnet / padding deferred to future ADR; for Year-1 we accept this metadata exposure |
| Recovery requires user-written-down 48-char key | Users will lose it; messages received during the device-less window are gone | UX: force the user to write down the key during onboarding; offer encrypted-cloud backup of the recovery key (encrypted with passphrase) as a convenience that doesn't break E2EE |
| No server-side full-text search | User cannot search old messages from a new device until history is decrypted locally | Client-side full-text index (IndexedDB); initial sync takes 10-60s for heavy users — show a progress bar |
| libolm is in maintenance mode (vodozemac is the future) | We'll need a library swap in ~12-18 months | Wire format is the same; the swap is a drop-in replacement, not a protocol migration. Plan it for after Egypt launch. |

---

## 7. Consequences

### Positive

- CIRKLE chat becomes **cryptographically server-blind** — operator cannot
  read messages even under subpoena. This is a defensible, marketable
  privacy claim matching the blueprint §28 covenant.
- Reuses audited, battle-tested Olm/Megolm — we don't become a crypto
  library maintainer.
- Multi-device, group scalability, disappearing messages, and recovery
  all come from the library, not from us.
- Federation with Matrix remains a future option (no door closed).
- Flutter path is clean via `matrix-rust-sdk` (Rust FFI to Flutter).
- Unifies chat E2EE with vault E2EE (both use Olm/Megolm) — one story.
- Calls already correct (DTLS-SRTP) — no change needed.
- Encrypted push payload design works on Web Push, APNs, FCM.

### Negative

- ~150 KB WASM bundle added to the web client (acceptable; one-time cost).
- First-message latency increases by ~80-120ms while libolm WASM
  instantiates (mitigated by preloading on app boot).
- Users must learn key verification (QR scan / SAS) — UX friction on
  first contact. Mitigated by TOFU + warning banners.
- Server-side search is gone forever — only client-side search possible.
- Recovery UX is hard — losing all devices without a recovery key means
  message loss. Onboarding must enforce recovery-key setup.
- We accept that the server sees minimal metadata (hashed IDs, bucketed
  timestamps, message sizes). Mixnet deferred.
- libolm → vodozemac migration is a deferred tech-debt item.

### Neutral

- The existing `src/lib/crypto.ts` (AES-256-GCM envelope encryption for
  server-owned secrets) is **unchanged** — it remains the right tool for
  OAuth tokens / webhook secrets / OIDC RSA keys. This ADR does not touch
  it.
- `src/lib/family-vault.ts` is **superseded** by the Olm/Megolm layer
  once shipped. The old code remains for migration; new vault uploads
  use Olm/Megolm; a migration script re-encrypts legacy vault items.
- `src/lib/call-manager.ts` is **unchanged** — DTLS-SRTP stays for calls.

---

## 8. Compliance Notes

- This ADR is **consistent** with blueprint §1 (Zero-Cost covenant): users
  pay nothing; the foundation's only cost is the libolm WASM bundle size
  (150 KB) and the pentest ($20k one-time).
- This ADR is **consistent** with blueprint §28 (Privacy): server-blind
  E2EE, disappearing messages, encrypted push, minimal metadata.
- This ADR is **consistent** with blueprint §3.4 (Federated Chat): uses
  the exact Olm/Megolm stack the blueprint specifies. Federation with
  Matrix.org is deferred but not precluded.
- This ADR is **consistent** with ADR-001 (Web-first PWA): libolm ships
  as WASM, runs in all modern browsers, no native dependency required.
- This ADR **does not violate** GDPR / Egyptian Personal Data Protection
  Law / Saudi PDPL — in fact it strengthens compliance: we cannot leak
  what we cannot decrypt.
- This ADR **may complicate** lawful-intercept obligations in some
  jurisdictions (e.g. Russia SORM, China") — counsel review required
  before launch in those planes. Mitigation: those planes may run a
  separate deployment with a different transport policy (metadata-only
  logging) — to be decided in a future plane-specific ADR.

---

## 9. References

- `CIRCLE BLUEPRINT v12.0` §3.4 (Federated Chat — Matrix Synapse + Olm/Megolm), §15 (Local Mesh), §26.6 (Family Vault), §28 (Privacy)
- `docs/ADR-001-platform-strategy.md` — Web-first PWA decision (this ADR is consistent with it)
- `src/lib/crypto.ts` — existing AES-256-GCM envelope encryption for server-owned secrets (unchanged)
- `src/lib/family-vault.ts` — existing client-side AES-256-GCM with PBKDF2-derived key (superseded by Olm/Megolm)
- `src/lib/call-manager.ts` — existing WebRTC DTLS-SRTP for calls (unchanged)
- `src/components/overlays/device-verify.tsx` — existing ZK attestation UI (extended for Olm key verification)
- Olm/Megolm spec — https://gitlab.matrix.org/matrix-org/olm/blob/master/docs/olm.md
- Megolm spec — https://gitlab.matrix.org/matrix-org/olm/blob/master/docs/megolm.md
- Matrix cross-signing — https://matrix.org/docs/guides/cross-signing
- NCC Group Olm audit (2016) — https://matrix.org/blog/2016/11/21/crypto-review-of-olm-libolm/
- Quarkslab Olm/Megolm audit (2024) — https://blog.quarkslab.com/audit-of-matrix-olm-and-megolm.html
- Element Web source (reference WASM integration) — https://github.com/element-hq/element-web
- libsignal (alternative considered) — https://github.com/signalapp/libsignal
- Signal Sender Keys spec — https://signal.org/docs/specifications/group/
- WebRTC DTLS-SRTP — RFC 8261, RFC 5764
- Web Crypto API (SubtleCrypto) — https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
- IndexedDB — https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

## 10. Decision Log

| Date | Action | Actor |
|---|---|---|
| 2026-08-09 | ADR drafted, status set to PROPOSED | Architecture Council |
| _pending_ | External security consultant review of IndexedDB KEK design | Security Lead |
| _pending_ | CTO review | CTO |
| _pending_ | Approved / Rejected / Revised | CTO |
| _pending_ | Pre-launch pentest (1 week, ~$20k) | Security Lead |
| _post-launch_ | libolm → vodozemac migration plan | Architecture Council |

---

**End of ADR-002**
