# Task ID: PHASE0-LEGAL
## Agent: Privacy Engineer + DPO

### Goal
Build Phase 0 privacy/legal compliance layer for Cirkle (دواير) to take legal compliance from 2/10 to launch-ready.

### Scope — 8 components
1. Privacy Policy + ToS overlays (EN+AR) wired into `circle:privacy-policy` / `circle:terms` events + Profile rows.
2. Cookie consent banner (4 buckets, versioned, localStorage persisted).
3. Age gate at registration (DOB field, COPPA block at <13, parental email for <16).
4. Real account deletion (cascade through all Prisma models).
5. Real data export (JSON download).
6. Consent management service (`src/lib/consent.ts`) + gating in ai.ts, news-service.ts, brain-federated.ts.
7. AES-256-GCM OAuth token encryption (`src/lib/crypto.ts`) wired into apps API.
8. DSR intake overlay + `DataSubjectRequest` Prisma model + `/api/account/dsr` route.

### Files Modified/Created
- prisma/schema.prisma (added DataSubjectRequest model)
- src/lib/crypto.ts (NEW)
- src/lib/consent.ts (NEW)
- src/lib/ai.ts (gating ai_personalization)
- src/lib/news-service.ts (gating analytics before LLM)
- src/lib/brain-federated.ts (gating federated_learning)
- src/lib/auth-store.ts (added dob + parentalEmail fields)
- src/components/auth/auth-screen.tsx (DOB step, age gate)
- src/components/overlays/privacy-policy.tsx (NEW)
- src/components/overlays/terms-of-service.tsx (NEW)
- src/components/overlays/dsr-request.tsx (NEW)
- src/components/cookie-consent-banner.tsx (NEW)
- src/app/api/account/delete/route.ts (NEW)
- src/app/api/account/export/route.ts (NEW)
- src/app/api/account/dsr/route.ts (NEW)
- src/app/api/apps/route.ts (encrypt/decrypt webhook secrets)
- src/screens/profile-screen.tsx (real delete + export + new rows)
- src/app/page.tsx (wire new overlays + cookie banner)

### Constraints honored
- No new npm deps (only built-in crypto).
- No files edited outside the listed set.
- bun run lint + bunx tsc --noEmit run at end.
- bun run db:push run after schema edit.
