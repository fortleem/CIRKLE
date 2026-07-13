/**
 * Circle (دواير) — Shared domain types.
 * Mirrors the Prisma schema in /prisma/schema.prisma.
 */

export type ID = string;

export interface CircleUser {
  id: ID;
  circleId: string; // @layla:matrix.circle.app
  displayName: string;
  arabicName?: string;
  avatarColor: string; // brand color token
  avatarInitials: string;
  verified?: boolean; // Circle Verify badge
  proProfile?: boolean;
  ghostMode?: boolean;
  region: string;
  joinedAt: string;
}

export interface Conversation {
  id: ID;
  type: "direct" | "group" | "channel";
  name: string;
  arabicName?: string;
  avatarColor: string;
  avatarInitials: string;
  participants: number;
  lastMessage?: string;
  lastSender?: string;
  lastSenderId?: ID;
  lastTimestamp?: string;
  /** Status of the most recent message — used by conversation previews to
   * show the WhatsApp-style clock / single-check / double-check / blue
   * double-check icons when the last message was sent by the current user. */
  lastMessageStatus?: MessageStatus;
  unread?: number;
  encrypted: boolean;
  pinned?: boolean;
  muted?: boolean;
  isCircle?: boolean;
  presence?: "online" | "away" | "offline" | "ghost";
}

export type MessageStatus = "pending" | "sent" | "delivered" | "read";

export interface ChatMessage {
  id: ID;
  conversationId: ID;
  senderId: ID;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  body: string;
  timestamp: string;
  status: MessageStatus;
  encrypted: boolean;
  reactions?: Record<string, number>;
  replyTo?: { id: ID; senderName: string; body: string } | null;
  attachment?: {
    kind: "image" | "audio" | "file" | "location" | "payment";
    name: string;
    meta?: string;
    url?: string;
    size?: number;
  } | null;
  forwardedFrom?: { senderName: string; body: string } | null;
  edited?: boolean;
  editedAt?: string;
  deletedAt?: string;
  isDeleted?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  ttlSeconds?: number | null;
  expiresAt?: string | null;
  systemEvent?: "call-started" | "call-ended" | "verify" | "ephemeral" | null;
}

export interface CircleGroup {
  id: ID;
  name: string;
  arabicName?: string;
  description: string;
  mode: "private" | "public" | "anonymous";
  members: number;
  online: number;
  avatarColor: string;
  avatarInitials: string;
  category: string;
  encrypted: boolean;
  role: "owner" | "admin" | "moderator" | "creator" | "member" | "viewer";
  upcomingEvent?: { title: string; date: string; attendees: number };
  unread?: number;
}

export interface Post {
  id: ID;
  authorId: ID;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  authorHandle: string;
  authorVerified?: boolean;
  body: string;
  arabicBody?: string;
  timestamp: string;
  visibility: "public" | "followers" | "circle" | "anonymous";
  module: "midan" | "lamahat" | "mashahd" | "circle";
  media?: {
    kind: "image" | "video" | "album" | "gif";
    count?: number;
    cover?: string; // gradient identifier
    durationSec?: number;
  } | null;
  location?: string;
  language?: string;
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  liked?: boolean;
  bookmarked?: boolean;
  pinned?: boolean;
  tags?: string[];
}

export interface VideoItem {
  id: ID;
  title: string;
  channelName: string;
  channelAvatarColor: string;
  channelVerified: boolean;
  durationSec: number;
  views: number;
  uploadedAt: string;
  category: string;
  thumbnail: string; // gradient identifier
  progress?: number; // 0-100 watch progress
  live?: boolean;
  viewers?: number;
}

export interface OfficialChannel {
  id: ID;
  name: string;
  arabicName?: string;
  category: "government" | "media" | "ngo" | "business";
  description: string;
  subscribers: number;
  avatarColor: string;
  avatarInitials: string;
  verified: true;
  emergency?: boolean;
  latestUpdate?: { body: string; timestamp: string };
}

export interface CreatorChannel {
  id: ID;
  name: string;
  handle: string;
  description: string;
  subscribers: number;
  videos: number;
  totalViews: number;
  avatarColor: string;
  avatarInitials: string;
  verified?: boolean;
  category: string;
  latestVideo?: string;
}

export interface JobPosting {
  id: ID;
  title: string;
  company: string;
  companyAvatarColor: string;
  companyInitials: string;
  location: string;
  remote: boolean;
  type: "full-time" | "part-time" | "contract" | "internship";
  salaryRange?: string;
  postedAt: string;
  applicants: number;
  tags: string[];
  matched?: number; // match score 0-100
}

export interface Transaction {
  id: ID;
  direction: "in" | "out";
  counterparty: string;
  counterpartyInitials: string;
  counterpartyColor: string;
  amount: number;
  currency: string;
  method: "fawry" | "vodafone-cash" | "instapay" | "wechat" | "alipay" | "upi" | "usdc" | "qr";
  memo?: string;
  timestamp: string;
  status: "settled" | "pending" | "failed";
  fee: number;
}

export interface VerifyClaim {
  id: ID;
  type: "over_18" | "nationality" | "professional" | "unique_human";
  label: string;
  issuedAt: string;
  status: "verified" | "pending" | "revoked";
  attestor: string;
}

export interface TravelItinerary {
  id: ID;
  destination: string;
  days: number;
  startDate: string;
  travelers: number;
  budget: string;
  interests: string[];
  generatedAt: string;
  days_data: {
    title: string;
    blocks: { time: string; title: string; description: string; kind: "stay" | "food" | "activity" | "transport" }[];
  }[];
}
