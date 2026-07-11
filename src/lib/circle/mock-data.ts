/**
 * Circle (دواير) — Default user fallback for SSR / pre-hydration.
 *
 * This is NOT mock data — it's a minimal default shape used before the
 * auth store hydrates on the client. The real user comes from the auth
 * store (useAuth.getState().user) which is populated at login.
 *
 * When no user is logged in, the UI shows a "Sign in" prompt rather
 * than displaying this fallback as a real user.
 */
import type {
  CircleUser,
  Conversation,
  ChatMessage,
  CircleGroup,
  Post,
  VideoItem,
  OfficialChannel,
  CreatorChannel,
  JobPosting,
  Transaction,
  VerifyClaim,
} from "@/lib/circle/types";

// Default user — used only as a type-shape fallback during SSR.
// The auth store overrides this with the real user after hydration.
export const CURRENT_USER: CircleUser = {
  id: "guest",
  circleId: "@guest:circle.app",
  displayName: "Guest",
  arabicName: "ضيف",
  avatarColor: "teal",
  avatarInitials: "G",
  verified: false,
  proProfile: false,
  region: "EG",
  joinedAt: new Date().toISOString(),
};

// Empty arrays — no mock content. Real data comes from the API.
export const SEED_CONVERSATIONS: Conversation[] = [];
export const SEED_MESSAGES: ChatMessage[] = [];
export const SEED_GROUPS: CircleGroup[] = [];
export const SEED_POSTS: Post[] = [];
export const SEED_VIDEOS: VideoItem[] = [];
export const SEED_OFFICIAL_CHANNELS: OfficialChannel[] = [];
export const SEED_CREATOR_CHANNELS: CreatorChannel[] = [];
export const SEED_JOBS: JobPosting[] = [];
export const SEED_TRANSACTIONS: Transaction[] = [];
export const SEED_VERIFY_CLAIMS: VerifyClaim[] = [];

// Backward-compatible aliases (empty — real data comes from API)
export const CONVERSATIONS = SEED_CONVERSATIONS;
export const MESSAGES_SEED: Record<string, ChatMessage[]> = {};
export const POSTS = SEED_POSTS;
export const TRANSACTIONS = SEED_TRANSACTIONS;
export const VERIFY_CLAIMS = SEED_VERIFY_CLAIMS;
export const CIRCLE_GROUPS = SEED_GROUPS;
export const VIDEOS = SEED_VIDEOS;
export const OFFICIAL_CHANNELS = SEED_OFFICIAL_CHANNELS;
export const CREATOR_CHANNELS = SEED_CREATOR_CHANNELS;
export const JOBS = SEED_JOBS;
