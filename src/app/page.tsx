"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, Plus } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Splash } from "@/components/splash";
import { CinematicEntrance } from "@/components/cinematic-entrance";
import { Onboarding } from "@/components/onboarding";
import { TopBar } from "@/components/shell/top-bar";
import { AIOrb } from "@/components/shell/ai-orb";
import { FloatingInsightBar } from "@/components/shell/floating-insight-bar";
import { Dock } from "@/components/shell/dock";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AIAssistant, type AIAction } from "@/components/overlays/ai-assistant";
import { CommandPalette } from "@/components/overlays/command-palette";
import { SettingsPanel } from "@/components/overlays/settings-panel";
import { GovernanceCenter } from "@/components/overlays/governance-center";
// Composer loaded dynamically
import { CircleHub } from "@/components/overlays/circle-hub";
import { CirclePulse } from "@/components/overlays/circle-pulse";
// TimeCapsule loaded dynamically
import { MoodFeed } from "@/components/overlays/mood-feed";
import { PrivacyShield } from "@/components/overlays/privacy-shield";
// ReceiptSplit loaded dynamically
import { CircleAura } from "@/components/overlays/circle-aura";
import { WhisperMode } from "@/components/overlays/whisper-mode";
import { CircleLens } from "@/components/overlays/circle-lens";
import { LiveTranslate } from "@/components/overlays/live-translate";
import { GroupMemory } from "@/components/overlays/group-memory";
import { VibeMatch } from "@/components/overlays/vibe-match";
import { AIRecap } from "@/components/overlays/ai-recap";
import { UniversalStory } from "@/components/overlays/universal-story";
// VesselTracker loaded dynamically
import { SmartInbox } from "@/components/overlays/smart-inbox";
import { MoodChat } from "@/components/overlays/mood-chat";
import { VoiceClone } from "@/components/overlays/voice-clone";
import { TribeChat } from "@/components/overlays/tribe-chat";
import { AIMediator } from "@/components/overlays/ai-mediator";
import { NoteSelf } from "@/components/overlays/note-self";
import { WordAura } from "@/components/overlays/word-aura";
import { AiDirector } from "@/components/overlays/ai-director";
import { CoWatch } from "@/components/overlays/co-watch";
import { ColorStory } from "@/components/overlays/color-story";
import { DebateArena } from "@/components/overlays/debate-arena";
import { EchoBreaker } from "@/components/overlays/echo-breaker";
import { EchoRemix } from "@/components/overlays/echo-remix";
import { LamahatViewer } from "@/components/overlays/lamahat-viewer";
import { LivingPhotos } from "@/components/overlays/living-photos";
import { MashahdPlayer } from "@/components/overlays/mashahd-player";
import { MeshPresence } from "@/components/overlays/mesh-presence";
import { MoodPlayer } from "@/components/overlays/mood-player";
import { MosaicStories } from "@/components/overlays/mosaic-stories";
import { PhotoGenealogy } from "@/components/overlays/photo-genealogy";
import { SmartChapters } from "@/components/overlays/smart-chapters";
import { ThreadTheatre } from "@/components/overlays/thread-theatre";
import { TimeShiftCam } from "@/components/overlays/time-shift-cam";
import { TopicDNA } from "@/components/overlays/topic-dna";
import { WordGarden } from "@/components/overlays/word-garden";
import { ChatMaze } from "@/components/overlays/chat-maze";
import { GhostInbox } from "@/components/overlays/ghost-inbox";
import { PrivacyPolicy } from "@/components/overlays/privacy-policy";
import { TermsOfService } from "@/components/overlays/terms-of-service";
import { DSRRequest } from "@/components/overlays/dsr-request";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { FirstLaunchTour, TOUR_STORAGE_KEY } from "@/components/first-launch-tour";
import { WhatsNew } from "@/components/overlays/whats-new";
// CitizenShield loaded dynamically
import type { TabId } from "@/lib/tabs";

const Composer = dynamic(() => import("@/components/overlays/composer").then(m => ({ default: m.Composer })), { ssr: false });
const TimeCapsule = dynamic(() => import("@/components/overlays/time-capsule").then(m => ({ default: m.TimeCapsule })), { ssr: false });
const ReceiptSplit = dynamic(() => import("@/components/overlays/receipt-split").then(m => ({ default: m.ReceiptSplit })), { ssr: false });
const CitizenShield = dynamic(() => import("@/components/overlays/citizen-shield").then(m => ({ default: m.CitizenShield })), { ssr: false });
const VesselTracker = dynamic(() => import("@/components/overlays/vessel-tracker").then(m => ({ default: m.VesselTracker })), { ssr: false });
const AddContact = dynamic(() => import("@/components/overlays/add-contact").then(m => ({ default: m.AddContact })), { ssr: false });
const ContactQR = dynamic(() => import("@/components/overlays/contact-qr").then(m => ({ default: m.ContactQR })), { ssr: false });
const InstitutionRegister = dynamic(() => import("@/components/overlays/institution-register").then(m => ({ default: m.InstitutionRegister })), { ssr: false });
const CirkleCommit = dynamic(() => import("@/components/overlays/cirkle-commit").then(m => ({ default: m.CirkleCommit })), { ssr: false });
const CirkleSentinel = dynamic(() => import("@/components/overlays/cirkle-sentinel").then(m => ({ default: m.CirkleSentinel })), { ssr: false });
const CirkleOracle = dynamic(() => import("@/components/overlays/cirkle-oracle").then(m => ({ default: m.CirkleOracle })), { ssr: false });
const CirkleSpark = dynamic(() => import("@/components/overlays/cirkle-spark").then(m => ({ default: m.CirkleSpark })), { ssr: false });
const CirkleCreate = dynamic(() => import("@/components/overlays/cirkle-create").then(m => ({ default: m.CirkleCreate })), { ssr: false });
const CircleGroupCreate = dynamic(() => import("@/components/overlays/circle-create").then(m => ({ default: m.CircleCreate })), { ssr: false });
const CircleGroupDetail = dynamic(() => import("@/components/overlays/circle-detail").then(m => ({ default: m.CircleDetail })), { ssr: false });
const CirkleLearn = dynamic(() => import("@/components/overlays/cirkle-learn").then(m => ({ default: m.CirkleLearn })), { ssr: false });
const CirkleGrow = dynamic(() => import("@/components/overlays/cirkle-grow").then(m => ({ default: m.CirkleGrow })), { ssr: false });
const CirkleCare = dynamic(() => import("@/components/overlays/cirkle-care").then(m => ({ default: m.CirkleCare })), { ssr: false });
const CirkleDNA = dynamic(() => import("@/components/overlays/cirkle-dna").then(m => ({ default: m.CirkleDNA })), { ssr: false });
const CirkleMood = dynamic(() => import("@/components/overlays/cirkle-mood").then(m => ({ default: m.CirkleMood })), { ssr: false });
const CirkleTime = dynamic(() => import("@/components/overlays/cirkle-time").then(m => ({ default: m.CirkleTime })), { ssr: false });
const CirkleVerse = dynamic(() => import("@/components/overlays/cirkle-verse").then(m => ({ default: m.CirkleVerse })), { ssr: false });
const CirkleShield = dynamic(() => import("@/components/overlays/cirkle-shield").then(m => ({ default: m.CirkleShield })), { ssr: false });
const CirkleMint = dynamic(() => import("@/components/overlays/cirkle-mint").then(m => ({ default: m.CirkleMint })), { ssr: false });
const VisaExplorer = dynamic(() => import("@/components/overlays/visa-explorer").then(m => ({ default: m.VisaExplorer })), { ssr: false });
const OverlayBrowser = dynamic(() => import("@/components/overlays/overlay-browser").then(m => ({ default: m.OverlayBrowser })), { ssr: false });
const CirkleIdentity = dynamic(() => import("@/components/overlays/cirkle-identity").then(m => ({ default: m.CirkleIdentity })), { ssr: false });
const ShieldDashboard = dynamic(() => import("@/components/overlays/shield-dashboard").then(m => ({ default: m.ShieldDashboard })), { ssr: false });
const DataResidency = dynamic(() => import("@/components/overlays/data-residency").then(m => ({ default: m.DataResidency })), { ssr: false });
const MeshDashboard = dynamic(() => import("@/components/overlays/mesh-dashboard").then(m => ({ default: m.MeshDashboard })), { ssr: false });
const OracleMarkets = dynamic(() => import("@/components/overlays/oracle-markets").then(m => ({ default: m.OracleMarkets })), { ssr: false });
const PersonalAIOS = dynamic(() => import("@/components/overlays/personal-ai-os").then(m => ({ default: m.PersonalAIOS })), { ssr: false });
const CallScreen = dynamic(() => import("@/components/overlays/call-screen").then(m => ({ default: m.CallScreen })), { ssr: false });
const BotDeveloper = dynamic(() => import("@/components/overlays/bot-developer").then(m => ({ default: m.BotDeveloper })), { ssr: false });
const CreatorStudio = dynamic(() => import("@/components/overlays/creator-studio").then(m => ({ default: m.CreatorStudio })), { ssr: false });
const AdStudio = dynamic(() => import("@/components/overlays/ad-studio").then(m => ({ default: m.AdStudio })), { ssr: false });
const CirkleGradebook = dynamic(() => import("@/components/overlays/cirkle-gradebook").then(m => ({ default: m.CirkleGradebook })), { ssr: false });
const KnowledgeWiki = dynamic(() => import("@/components/overlays/knowledge-wiki").then(m => ({ default: m.KnowledgeWiki })), { ssr: false });
const ProNetwork = dynamic(() => import("@/components/overlays/pro-network").then(m => ({ default: m.ProNetwork })), { ssr: false });
const CirkleMaps = dynamic(() => import("@/components/overlays/cirkle-maps").then(m => ({ default: m.CirkleMaps })), { ssr: false });
const CircleMail = dynamic(() => import("@/components/overlays/circle-mail").then(m => ({ default: m.CircleMail })), { ssr: false });
const BulletComments = dynamic(() => import("@/components/overlays/bullet-comments").then(m => ({ default: m.BulletComments })), { ssr: false });
const FamilyVault = dynamic(() => import("@/components/overlays/family-vault").then(m => ({ default: m.FamilyVault })), { ssr: false });
const TicketMint = dynamic(() => import("@/components/overlays/ticket-mint").then(m => ({ default: m.TicketMint })), { ssr: false });
const PhoneMigrate = dynamic(() => import("@/components/overlays/phone-migrate").then(m => ({ default: m.PhoneMigrate })), { ssr: false });
const BrainOrchestrator = dynamic(() => import("@/components/overlays/brain-orchestrator").then(m => ({ default: m.BrainOrchestrator })), { ssr: false });
const BroadcastChannel = dynamic(() => import("@/components/overlays/broadcast-channel").then(m => ({ default: m.BroadcastChannel })), { ssr: false });
const GifPicker = dynamic(() => import("@/components/overlays/gif-picker").then(m => ({ default: m.GifPicker })), { ssr: false });
const WorkMode = dynamic(() => import("@/components/overlays/work-mode").then(m => ({ default: m.WorkMode })), { ssr: false });
const DeviceVerify = dynamic(() => import("@/components/overlays/device-verify").then(m => ({ default: m.DeviceVerify })), { ssr: false });
// ── ADMIN PANEL: Platform administration (building phase — no auth) ──
const AdminPanel = dynamic(() => import("@/components/overlays/admin-panel").then(m => ({ default: m.AdminPanel })), { ssr: false });
const MemoryDashboard = dynamic(() => import("@/components/overlays/memory-dashboard").then(m => ({ default: m.MemoryDashboard })), { ssr: false });
const TransparencyDashboard = dynamic(() => import("@/components/overlays/transparency-dashboard").then(m => ({ default: m.TransparencyDashboard })), { ssr: false });
const PerformanceDashboard = dynamic(() => import("@/components/overlays/performance-dashboard").then(m => ({ default: m.PerformanceDashboard })), { ssr: false });
const ComparisonView = dynamic(() => import("@/components/overlays/comparison-view").then(m => ({ default: m.ComparisonView })), { ssr: false });
// ── CREATIVE-1: Smart social overlays (compose + analytics + notifications) ──
const SmartCompose = dynamic(() => import("@/components/overlays/smart-compose").then(m => ({ default: m.SmartCompose })), { ssr: false });
const SocialAnalytics = dynamic(() => import("@/components/overlays/social-analytics").then(m => ({ default: m.SocialAnalytics })), { ssr: false });
const SmartNotifications = dynamic(() => import("@/components/overlays/smart-notifications").then(m => ({ default: m.SmartNotifications })), { ssr: false });
// ── CREATIVE-2: More creative social overlays (graph + calendar + discovery) ──
const ConnectionGraph = dynamic(() => import("@/components/overlays/connection-graph").then(m => ({ default: m.ConnectionGraph })), { ssr: false });
const ContentCalendar = dynamic(() => import("@/components/overlays/content-calendar").then(m => ({ default: m.ContentCalendar })), { ssr: false });
const ContentDiscovery = dynamic(() => import("@/components/overlays/content-discovery").then(m => ({ default: m.ContentDiscovery })), { ssr: false });
// ── TIER B+A+E: Chat core + voice/video + AI overlays (19) ──
const MessageReactions = dynamic(() => import("@/components/overlays/message-reactions").then(m => ({ default: m.MessageReactions })), { ssr: false });
const MessageEditHistory = dynamic(() => import("@/components/overlays/message-edit-history").then(m => ({ default: m.MessageEditHistory })), { ssr: false });
const ReplyThread = dynamic(() => import("@/components/overlays/reply-thread").then(m => ({ default: m.ReplyThread })), { ssr: false });
const DisappearingMessages = dynamic(() => import("@/components/overlays/disappearing-messages").then(m => ({ default: m.DisappearingMessages })), { ssr: false });
const ScheduledMessages = dynamic(() => import("@/components/overlays/scheduled-messages").then(m => ({ default: m.ScheduledMessages })), { ssr: false });
const WebRTCCall = dynamic(() => import("@/components/overlays/webrtc-call").then(m => ({ default: m.WebRTCCall })), { ssr: false });
const VoiceMessageRecorder = dynamic(() => import("@/components/overlays/voice-message-recorder").then(m => ({ default: m.VoiceMessageRecorder })), { ssr: false });
const GroupVideoCall = dynamic(() => import("@/components/overlays/group-video-call").then(m => ({ default: m.GroupVideoCall })), { ssr: false });
const VoiceRoom = dynamic(() => import("@/components/overlays/voice-room").then(m => ({ default: m.VoiceRoom })), { ssr: false });
const MeetingNotesOverlay = dynamic(() => import("@/components/overlays/meeting-notes").then(m => ({ default: m.MeetingNotesOverlay })), { ssr: false });
const VoiceCloneStudio = dynamic(() => import("@/components/overlays/voice-clone-studio").then(m => ({ default: m.VoiceCloneStudio })), { ssr: false });
const SmartReplyChips = dynamic(() => import("@/components/overlays/smart-reply-chips").then(m => ({ default: m.SmartReplyChips })), { ssr: false });
const UniversalShareSheet = dynamic(() => import("@/components/overlays/universal-share-sheet").then(m => ({ default: m.UniversalShareSheet })), { ssr: false });
const AICatchUp = dynamic(() => import("@/components/overlays/ai-catch-up").then(m => ({ default: m.AICatchUp })), { ssr: false });
const SmartNotificationsV2 = dynamic(() => import("@/components/overlays/smart-notifications-v2").then(m => ({ default: m.SmartNotificationsV2 })), { ssr: false });
const AIToneAdjuster = dynamic(() => import("@/components/overlays/ai-tone-adjuster").then(m => ({ default: m.AIToneAdjuster })), { ssr: false });
const AIConversationStarters = dynamic(() => import("@/components/overlays/ai-conversation-starters").then(m => ({ default: m.AIConversationStarters })), { ssr: false });
const AIFriendshipHealth = dynamic(() => import("@/components/overlays/ai-friendship-health").then(m => ({ default: m.AIFriendshipHealth })), { ssr: false });
const AIActionItems = dynamic(() => import("@/components/overlays/ai-action-items").then(m => ({ default: m.AIActionItems })), { ssr: false });
// ── TIER D+F: Revenue + Polish overlays (10) ──
const VerifiedBadgeApply = dynamic(() => import("@/components/overlays/verified-badge-apply").then(m => ({ default: m.VerifiedBadgeApply })), { ssr: false });
const CommitTemplatesOverlay = dynamic(() => import("@/components/overlays/commit-templates").then(m => ({ default: m.CommitTemplatesOverlay })), { ssr: false });
const PremiumFeatures = dynamic(() => import("@/components/overlays/premium-features").then(m => ({ default: m.PremiumFeatures })), { ssr: false });
const ChatFolders = dynamic(() => import("@/components/overlays/chat-folders").then(m => ({ default: m.ChatFolders })), { ssr: false });
const SavedMessages = dynamic(() => import("@/components/overlays/saved-messages").then(m => ({ default: m.SavedMessages })), { ssr: false });
const MessageSearch = dynamic(() => import("@/components/overlays/message-search").then(m => ({ default: m.MessageSearch })), { ssr: false });
const StoryStatus = dynamic(() => import("@/components/overlays/story-status").then(m => ({ default: m.StoryStatus })), { ssr: false });
const AppLock = dynamic(() => import("@/components/overlays/app-lock").then(m => ({ default: m.AppLock })), { ssr: false });
const LiveLocation = dynamic(() => import("@/components/overlays/live-location").then(m => ({ default: m.LiveLocation })), { ssr: false });
const PollCreator = dynamic(() => import("@/components/overlays/poll-creator").then(m => ({ default: m.PollCreator })), { ssr: false });
// ── ACA + FEDERATED GOV + EMERGENCY + EVIDENCE/AI/POLICY overlays (12) ──
const AcaLogin = dynamic(() => import("@/components/overlays/aca-login").then(m => ({ default: m.AcaLogin })), { ssr: false });
const AcaDashboard = dynamic(() => import("@/components/overlays/aca-dashboard").then(m => ({ default: m.AcaDashboard })), { ssr: false });
const AcaCaseDetail = dynamic(() => import("@/components/overlays/aca-case-detail").then(m => ({ default: m.AcaCaseDetail })), { ssr: false });
const GovernmentInstitutionRegistry = dynamic(() => import("@/components/overlays/government-institution-registry").then(m => ({ default: m.GovernmentInstitutionRegistry })), { ssr: false });
const InterAgencyReferralOvl = dynamic(() => import("@/components/overlays/inter-agency-referral").then(m => ({ default: m.InterAgencyReferral })), { ssr: false });
const ServiceDirectory = dynamic(() => import("@/components/overlays/service-directory").then(m => ({ default: m.ServiceDirectory })), { ssr: false });
const SmartRouting = dynamic(() => import("@/components/overlays/smart-routing").then(m => ({ default: m.SmartRouting })), { ssr: false });
const EmergencyRouting = dynamic(() => import("@/components/overlays/emergency-routing").then(m => ({ default: m.EmergencyRouting })), { ssr: false });
const ServiceOutageReport = dynamic(() => import("@/components/overlays/service-outage-report").then(m => ({ default: m.ServiceOutageReport })), { ssr: false });
const EvidenceVault = dynamic(() => import("@/components/overlays/evidence-vault").then(m => ({ default: m.EvidenceVault })), { ssr: false });
const AIGovernancePanel = dynamic(() => import("@/components/overlays/ai-governance-panel").then(m => ({ default: m.AIGovernancePanel })), { ssr: false });
const PolicyEngineOverlay = dynamic(() => import("@/components/overlays/policy-engine").then(m => ({ default: m.PolicyEngineOverlay })), { ssr: false });
import { useApp } from "@/lib/app-store";
import { useAuth } from "@/lib/auth-store";
import { toast } from "sonner";

import { HomeScreen } from "@/screens/home-screen";
import { WaslScreen } from "@/screens/wasl-screen";
import { MashahdScreen } from "@/screens/mashahd-screen";
import { LamahatScreen } from "@/screens/lamahat-screen";
import { MidanScreen } from "@/screens/midan-screen";
import { RihlaScreen } from "@/screens/rihla-screen";
import { PayScreen } from "@/screens/pay-screen";
import { ProfileScreen } from "@/screens/profile-screen";
import { ErrorBoundary } from "@/components/error-boundary";

// Each screen is wrapped in its own ErrorBoundary so a render-time crash in
// one pillar (e.g. Profile throwing on a missing user field) does not bring
// down the whole app. The boundary shows retry/home buttons and reports the
// screenName for debugging.
const screens: Record<TabId, () => ReactElement> = {
  home: () => (
    <ErrorBoundary screenName="home">
      <HomeScreen />
    </ErrorBoundary>
  ),
  wasl: () => (
    <ErrorBoundary screenName="wasl">
      <WaslScreen />
    </ErrorBoundary>
  ),
  mashahd: () => (
    <ErrorBoundary screenName="mashahd">
      <MashahdScreen />
    </ErrorBoundary>
  ),
  lamahat: () => (
    <ErrorBoundary screenName="lamahat">
      <LamahatScreen />
    </ErrorBoundary>
  ),
  midan: () => (
    <ErrorBoundary screenName="midan">
      <MidanScreen />
    </ErrorBoundary>
  ),
  rihla: () => (
    <ErrorBoundary screenName="rihla">
      <RihlaScreen />
    </ErrorBoundary>
  ),
  pay: () => (
    <ErrorBoundary screenName="pay">
      <PayScreen />
    </ErrorBoundary>
  ),
  profile: () => (
    <ErrorBoundary screenName="profile">
      <ProfileScreen />
    </ErrorBoundary>
  ),
};

const titles: Record<TabId, string | undefined> = {
  home: undefined, wasl: "Wasl", mashahd: "Mashahd", lamahat: "Lamahat",
  midan: "Midan", rihla: "Rihla", pay: "Cirkle Pay", profile: "You",
};

// ── Hash-based tab routing ────────────────────────────────────
// Supports deep links (#/wasl, #/midan, …) and back/forward buttons.
const TAB_IDS = ["home", "wasl", "mashahd", "lamahat", "midan", "rihla", "pay", "profile"] as const;

function getTabFromHash(): TabId {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace(/^#\//, "");
  return (TAB_IDS as readonly string[]).includes(hash) ? (hash as TabId) : "home";
}

function tabToHash(t: TabId): string {
  return t === "home" ? "" : `#/${t}`;
}

export default function Page() {
  const { setOnboarded, hydrate, onboarded, setCountry, country } = useApp();
  const { isAuthenticated, hydrate: hydrateAuth, hydrated: authHydrated, user, setAuthView } = useAuth();
  const isOnline = useOnlineStatus();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Hydrate the stores from localStorage on mount (SSR-safe).
  useEffect(() => {
    hydrate();
    hydrateAuth();
  }, [hydrate, hydrateAuth]);

  // When user logs out (isAuthenticated goes false), reset splash so they see
  // the CinematicEntrance landing page again (not a bare AuthScreen form).
  useEffect(() => {
    if (authHydrated && !isAuthenticated) {
      // Defer to avoid cascading renders
      Promise.resolve().then(() => setShowSplash(true));
    }
  }, [authHydrated, isAuthenticated]);

  // Sync the user's registered country to the app store after auth hydrates.
  useEffect(() => {
    if (authHydrated && user?.country) {
      setCountry(user.country);
    }
  }, [authHydrated, user, setCountry]);

  // Root fix: authenticated users skip onboarding.
  useEffect(() => {
    if (authHydrated && isAuthenticated && !onboarded) {
      const t = setTimeout(() => { setOnboarded(true); setShowOnboarding(false); }, 0);
      return () => clearTimeout(t);
    }
  }, [authHydrated, isAuthenticated, onboarded, setOnboarded]);

  // Show onboarding only after splash + hydration (prevents SSR mismatch).
  useEffect(() => {
    if (!showSplash && !onboarded) {
      const t = setTimeout(() => setShowOnboarding(true), 0);
      return () => clearTimeout(t);
    }
  }, [showSplash, onboarded]);

  // First-launch in-app tour: shown once after the user is authenticated
  // and the splash + intro onboarding are dismissed. Completion / skip state
  // is persisted under `cirkle-onboarding-completed` so it never re-appears.
  useEffect(() => {
    if (!authHydrated || !isAuthenticated || showSplash || showOnboarding) return;
    let done: string | null = null;
    try {
      done = localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      done = null;
    }
    if (!done) {
      const t = setTimeout(() => setShowTour(true), 700);
      return () => clearTimeout(t);
    }
  }, [authHydrated, isAuthenticated, showSplash, showOnboarding]);

  const closeTour = useCallback((completed: boolean) => {
    setShowTour(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, completed ? "completed" : "skipped");
    } catch {
      /* ignore localStorage errors (private mode, quota, etc.) */
    }
  }, []);

  // Initial tab is read from the URL hash via a lazy initializer (SSR-safe:
  // getTabFromHash returns "home" on the server, and `tab` is not consumed in
  // the auth-gated SSR output, so there is no hydration mismatch).
  const [tab, setTabState] = useState<TabId>(() => getTabFromHash());

  // Hash-based routing: keep the URL hash and tab state in sync so refresh +
  // back/forward work. On mount we normalize the URL (replaceState → no
  // duplicate history entry); the hashchange listener syncs back/forward
  // navigation into React state.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const targetHash = tabToHash(getTabFromHash());
      if (window.location.hash !== targetHash) {
        const url = targetHash || `${window.location.pathname}${window.location.search}`;
        window.history.replaceState(null, "", url);
      }
    }
    const onHashChange = () => setTabState(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setTab = useCallback((t: TabId) => {
    setTabState(t);
    if (typeof window !== "undefined") {
      const newHash = tabToHash(t);
      // pushState creates a real history entry so the back button returns to
      // the previous tab (pushState itself does not fire hashchange).
      if (window.location.hash !== newHash) {
        const url = newHash || `${window.location.pathname}${window.location.search}`;
        window.history.pushState(null, "", url);
      }
    }
  }, []);

  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);
  const [pulseOpen, setPulseOpen] = useState(false);
  const [timeCapsuleOpen, setTimeCapsuleOpen] = useState(false);
  const [moodFeedOpen, setMoodFeedOpen] = useState(false);
  const [privacyShieldOpen, setPrivacyShieldOpen] = useState(false);
  const [receiptSplitOpen, setReceiptSplitOpen] = useState(false);
  const [auraOpen, setAuraOpen] = useState(false);
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [lensOpen, setLensOpen] = useState(false);
  const [liveTranslateOpen, setLiveTranslateOpen] = useState(false);
  const [groupMemoryOpen, setGroupMemoryOpen] = useState(false);
  const [vibeMatchOpen, setVibeMatchOpen] = useState(false);
  const [aiRecapOpen, setAiRecapOpen] = useState(false);
  const [universalStoryOpen, setUniversalStoryOpen] = useState(false);
  const [vesselTrackerOpen, setVesselTrackerOpen] = useState(false);
  const [smartInboxOpen, setSmartInboxOpen] = useState(false);
  const [moodChatOpen, setMoodChatOpen] = useState(false);
  const [voiceCloneOpen, setVoiceCloneOpen] = useState(false);
  const [tribeChatOpen, setTribeChatOpen] = useState(false);
  const [aiMediatorOpen, setAiMediatorOpen] = useState(false);
  const [noteSelfOpen, setNoteSelfOpen] = useState(false);
  const [wordAuraOpen, setWordAuraOpen] = useState(false);
  const [chatMazeOpen, setChatMazeOpen] = useState(false);
  const [ghostInboxOpen, setGhostInboxOpen] = useState(false);
  const [citizenShieldOpen, setCitizenShieldOpen] = useState(false);
  const [aidirectorOpen, setAidirectorOpen] = useState(false);
  const [cowatchOpen, setCowatchOpen] = useState(false);
  const [colorstoryOpen, setColorstoryOpen] = useState(false);
  const [debatearenaOpen, setDebatearenaOpen] = useState(false);
  const [echobreakerOpen, setEchobreakerOpen] = useState(false);
  const [echoremixOpen, setEchoremixOpen] = useState(false);
  const [lamahatviewerOpen, setLamahatviewerOpen] = useState(false);
  const [livingphotosOpen, setLivingphotosOpen] = useState(false);
  const [mashahdplayerOpen, setMashahdplayerOpen] = useState(false);
  const [meshpresenceOpen, setMeshpresenceOpen] = useState(false);
  const [moodplayerOpen, setMoodplayerOpen] = useState(false);
  const [mosaicstoriesOpen, setMosaicstoriesOpen] = useState(false);
  const [photogenealogyOpen, setPhotogenealogyOpen] = useState(false);
  const [smartchaptersOpen, setSmartchaptersOpen] = useState(false);
  const [threadtheatreOpen, setThreadtheatreOpen] = useState(false);
  const [timeshiftcamOpen, setTimeshiftcamOpen] = useState(false);
  const [topicdnaOpen, setTopicdnaOpen] = useState(false);
  const [wordgardenOpen, setWordgardenOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [contactQrOpen, setContactQrOpen] = useState(false);
  const [institutionRegisterOpen, setInstitutionRegisterOpen] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [sentinelOpen, setSentinelOpen] = useState(false);
  const [oracleOpen, setOracleOpen] = useState(false);
  const [sparkOpen, setSparkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [growOpen, setGrowOpen] = useState(false);
  const [careOpen, setCareOpen] = useState(false);
  const [dnaOpen, setDnaOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [verseOpen, setVerseOpen] = useState(false);
  const [cirkleShieldOpen, setCirkleShieldOpen] = useState(false);
  const [mintOpen, setMintOpen] = useState(false);
  const [visaExplorerOpen, setVisaExplorerOpen] = useState(false);
  const [overlayBrowserOpen, setOverlayBrowserOpen] = useState(false);
  const [personalAIOpen, setPersonalAIOpen] = useState(false);
  const [meshDashboardOpen, setMeshDashboardOpen] = useState(false);
  const [oracleMarketsOpen, setOracleMarketsOpen] = useState(false);
  const [creatorStudioOpen, setCreatorStudioOpen] = useState(false);
  const [cirkleIdentityOpen, setCirkleIdentityOpen] = useState(false);
  const [shieldDashboardOpen, setShieldDashboardOpen] = useState(false);
  const [dataResidencyOpen, setDataResidencyOpen] = useState(false);
  const [callScreenOpen, setCallScreenOpen] = useState(false);
  const [botDeveloperOpen, setBotDeveloperOpen] = useState(false);
  const [adStudioOpen, setAdStudioOpen] = useState(false);
  const [cirkleGradebookOpen, setCirkleGradebookOpen] = useState(false);
  const [knowledgeWikiOpen, setKnowledgeWikiOpen] = useState(false);
  const [bulletCommentsOpen, setBulletCommentsOpen] = useState(false);
  const [familyVaultOpen, setFamilyVaultOpen] = useState(false);
  const [ticketMintOpen, setTicketMintOpen] = useState(false);
  const [phoneMigrateOpen, setPhoneMigrateOpen] = useState(false);
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [workModeOpen, setWorkModeOpen] = useState(false);
  const [deviceVerifyOpen, setDeviceVerifyOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [memoryDashboardOpen, setMemoryDashboardOpen] = useState(false);
  const [transparencyDashboardOpen, setTransparencyDashboardOpen] = useState(false);
  const [performanceDashboardOpen, setPerformanceDashboardOpen] = useState(false);
  const [comparisonViewOpen, setComparisonViewOpen] = useState(false);
  // ── CREATIVE-1: Smart social overlays ──
  const [smartComposeOpen, setSmartComposeOpen] = useState(false);
  const [socialAnalyticsOpen, setSocialAnalyticsOpen] = useState(false);
  const [smartNotificationsOpen, setSmartNotificationsOpen] = useState(false);
  // ── CREATIVE-2: More creative social overlays ──
  const [connectionGraphOpen, setConnectionGraphOpen] = useState(false);
  const [contentCalendarOpen, setContentCalendarOpen] = useState(false);
  const [contentDiscoveryOpen, setContentDiscoveryOpen] = useState(false);
  const [proNetworkOpen, setProNetworkOpen] = useState(false);
  const [cirkleMapsOpen, setCirkleMapsOpen] = useState(false);
  const [circleMailOpen, setCircleMailOpen] = useState(false);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [dsrOpen, setDsrOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [circleCreateOpen, setCircleCreateOpen] = useState(false);
  // ── TIER B+A+E overlay state (19) ──
  const [messageReactionsOpen, setMessageReactionsOpen] = useState(false);
  const [editHistoryOpen, setEditHistoryOpen] = useState(false);
  const [replyThreadOpen, setReplyThreadOpen] = useState(false);
  const [disappearingOpen, setDisappearingOpen] = useState(false);
  const [scheduledMessagesOpen, setScheduledMessagesOpen] = useState(false);
  const [webrtcCallOpen, setWebrtcCallOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [groupVideoCallOpen, setGroupVideoCallOpen] = useState(false);
  const [voiceRoomOpen, setVoiceRoomOpen] = useState(false);
  const [meetingNotesOpen, setMeetingNotesOpen] = useState(false);
  const [voiceCloneStudioOpen, setVoiceCloneStudioOpen] = useState(false);
  const [smartReplyOpen, setSmartReplyOpen] = useState(false);
  const [universalShareOpen, setUniversalShareOpen] = useState(false);
  const [aiCatchUpOpen, setAiCatchUpOpen] = useState(false);
  const [smartNotificationsV2Open, setSmartNotificationsV2Open] = useState(false);
  const [toneAdjusterOpen, setToneAdjusterOpen] = useState(false);
  const [conversationStartersOpen, setConversationStartersOpen] = useState(false);
  const [friendshipHealthOpen, setFriendshipHealthOpen] = useState(false);
  const [actionItemsOpen, setActionItemsOpen] = useState(false);
  // ── TIER D+F overlay state (10) ──
  const [verifiedBadgeOpen, setVerifiedBadgeOpen] = useState(false);
  const [commitTemplatesOpen, setCommitTemplatesOpen] = useState(false);
  const [premiumFeaturesOpen, setPremiumFeaturesOpen] = useState(false);
  const [chatFoldersOpen, setChatFoldersOpen] = useState(false);
  const [savedMessagesOpen, setSavedMessagesOpen] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [storyStatusOpen, setStoryStatusOpen] = useState(false);
  const [appLockOpen, setAppLockOpen] = useState(false);
  const [liveLocationOpen, setLiveLocationOpen] = useState(false);
  const [pollCreatorOpen, setPollCreatorOpen] = useState(false);
  // ── ACA + FED + EMERGENCY + EVIDENCE/AI/POLICY overlay state (12) ──
  const [acaLoginOpen, setAcaLoginOpen] = useState(false);
  const [acaDashboardOpen, setAcaDashboardOpen] = useState(false);
  const [acaCaseDetailOpen, setAcaCaseDetailOpen] = useState(false);
  const [institutionRegistryOpen, setInstitutionRegistryOpen] = useState(false);
  const [interAgencyReferralOpen, setInterAgencyReferralOpen] = useState(false);
  const [serviceDirectoryOpen, setServiceDirectoryOpen] = useState(false);
  const [smartRoutingOpen, setSmartRoutingOpen] = useState(false);
  const [emergencyRoutingOpen, setEmergencyRoutingOpen] = useState(false);
  const [serviceOutageOpen, setServiceOutageOpen] = useState(false);
  const [evidenceVaultOpen, setEvidenceVaultOpen] = useState(false);
  const [aiGovernanceOpen, setAiGovernanceOpen] = useState(false);
  const [policyEngineOpen, setPolicyEngineOpen] = useState(false);
  const [circleDetailId, setCircleDetailId] = useState<string | null>(null);
  const [composer, setComposer] = useState<{ open: boolean; kind?: "post" | "poll" | "media"; draft?: string; anonymous?: boolean; circleId?: string }>({ open: false });
  const Screen = screens[tab];

  // Splash/cinematic entrance stays until user clicks "Continue" or "Register/Sign in"
  // No auto-dismiss timer — the landing page waits for user action

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(o => !o); }
      if (e.key === "Escape") {
        setPaletteOpen(false); setAiOpen(false); setSettingsOpen(false); setGovernanceOpen(false);
        setComposer({ open: false }); setHubOpen(false); setPulseOpen(false);
        setTimeCapsuleOpen(false); setMoodFeedOpen(false); setPrivacyShieldOpen(false);
        setReceiptSplitOpen(false); setAuraOpen(false);
        setWhisperOpen(false); setLensOpen(false); setLiveTranslateOpen(false);
        setGroupMemoryOpen(false); setVibeMatchOpen(false);
        setAiRecapOpen(false); setUniversalStoryOpen(false); setVesselTrackerOpen(false); setSmartInboxOpen(false);
        setMoodChatOpen(false); setVoiceCloneOpen(false); setTribeChatOpen(false); setAiMediatorOpen(false);
        setNoteSelfOpen(false); setWordAuraOpen(false); setChatMazeOpen(false); setGhostInboxOpen(false);
        setCitizenShieldOpen(false); setAidirectorOpen(false); setCowatchOpen(false); setColorstoryOpen(false); setDebatearenaOpen(false); setEchobreakerOpen(false); setEchoremixOpen(false); setLamahatviewerOpen(false); setLivingphotosOpen(false); setMashahdplayerOpen(false); setMeshpresenceOpen(false); setMoodplayerOpen(false); setMosaicstoriesOpen(false); setPhotogenealogyOpen(false); setSmartchaptersOpen(false); setThreadtheatreOpen(false); setTimeshiftcamOpen(false); setTopicdnaOpen(false); setWordgardenOpen(false);
        setAddContactOpen(false); setContactQrOpen(false); setInstitutionRegisterOpen(false);
        setOverlayBrowserOpen(false);
        setPersonalAIOpen(false);
        setMeshDashboardOpen(false);
        setOracleMarketsOpen(false);
        setCreatorStudioOpen(false);
        setCirkleIdentityOpen(false);
        setShieldDashboardOpen(false);
        setDataResidencyOpen(false);
        setCallScreenOpen(false);
        setBotDeveloperOpen(false);
        setAdStudioOpen(false);
        setCirkleGradebookOpen(false);
        setKnowledgeWikiOpen(false);
        setPollCreatorOpen(false);
        setBulletCommentsOpen(false);
        setFamilyVaultOpen(false);
        setTicketMintOpen(false);
        setPhoneMigrateOpen(false);
        setProNetworkOpen(false);
        setCirkleMapsOpen(false);
        setCircleMailOpen(false);
        setPrivacyPolicyOpen(false);
        setTermsOpen(false);
        setDsrOpen(false);
        setTransparencyDashboardOpen(false);
        setPerformanceDashboardOpen(false);
        setComparisonViewOpen(false);
        // CREATIVE-1
        setSmartComposeOpen(false);
        setSocialAnalyticsOpen(false);
        setSmartNotificationsOpen(false);
        // CREATIVE-2
        setConnectionGraphOpen(false);
        setContentCalendarOpen(false);
        setContentDiscoveryOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const onComposer = (e: Event & { detail?: { kind?: "post" | "poll" | "media"; draft?: string; anonymous?: boolean; circleId?: string } }) =>
      setComposer({ open: true, kind: e.detail?.kind, draft: e.detail?.draft, anonymous: e.detail?.anonymous, circleId: e.detail?.circleId });
    const onGovernance = () => setGovernanceOpen(true);
    const onSettings = () => setSettingsOpen(true);
    const onAi = () => setAiOpen(true);
    const onHub = () => setHubOpen(true);
    const onPulse = () => setPulseOpen(true);
    const onTimeCapsule = () => setTimeCapsuleOpen(true);
    const onMoodFeed = () => setMoodFeedOpen(true);
    const onPrivacyShield = () => setPrivacyShieldOpen(true);
    const onReceiptSplit = () => setReceiptSplitOpen(true);
    const onAura = () => setAuraOpen(true);
    const onWhisper = () => setWhisperOpen(true);
    const onLens = () => setLensOpen(true);
    const onLiveTranslate = () => setLiveTranslateOpen(true);
    const onGroupMemory = () => setGroupMemoryOpen(true);
    const onVibeMatch = () => setVibeMatchOpen(true);
    const onAiRecap = () => setAiRecapOpen(true);
    const onUniversalStory = () => setUniversalStoryOpen(true);
    const onVesselTracker = () => setVesselTrackerOpen(true);
    const onSmartInbox = () => setSmartInboxOpen(true);
    const onMoodChat = () => setMoodChatOpen(true);
    const onVoiceClone = () => setVoiceCloneOpen(true);
    const onTribeChat = () => setTribeChatOpen(true);
    const onAiMediator = () => setAiMediatorOpen(true);
    const onNoteSelf = () => setNoteSelfOpen(true);
    const onWordAura = () => setWordAuraOpen(true);
    const onChatMaze = () => setChatMazeOpen(true);
    const onGhostInbox = () => setGhostInboxOpen(true);
    const onCitizenShield = () => setCitizenShieldOpen(true);
    const onAidirector = () => setAidirectorOpen(true);
    const onCowatch = () => setCowatchOpen(true);
    const onColorstory = () => setColorstoryOpen(true);
    const onDebatearena = () => setDebatearenaOpen(true);
    const onEchobreaker = () => setEchobreakerOpen(true);
    const onEchoremix = () => setEchoremixOpen(true);
    const onLamahatviewer = () => setLamahatviewerOpen(true);
    const onLivingphotos = () => setLivingphotosOpen(true);
    const onMashahdplayer = () => setMashahdplayerOpen(true);
    const onMeshpresence = () => setMeshpresenceOpen(true);
    const onMoodplayer = () => setMoodplayerOpen(true);
    const onMosaicstories = () => setMosaicstoriesOpen(true);
    const onPhotogenealogy = () => setPhotogenealogyOpen(true);
    const onSmartchapters = () => setSmartchaptersOpen(true);
    const onThreadtheatre = () => setThreadtheatreOpen(true);
    const onTimeshiftcam = () => setTimeshiftcamOpen(true);
    const onTopicdna = () => setTopicdnaOpen(true);
    const onWordgarden = () => setWordgardenOpen(true);

    const onNavigate = (e: Event & { detail?: { tab?: string } }) => { if (e.detail?.tab) setTab(e.detail.tab as TabId); };
    window.addEventListener("circle:composer", onComposer as any);
    window.addEventListener("circle:governance", onGovernance);
    window.addEventListener("circle:settings", onSettings);
    window.addEventListener("circle:ai", onAi);
    window.addEventListener("circle:hub", onHub);
    window.addEventListener("circle:pulse", onPulse);
    window.addEventListener("circle:time-capsule", onTimeCapsule);
    window.addEventListener("circle:mood-feed", onMoodFeed);
    window.addEventListener("circle:privacy-shield", onPrivacyShield);
    window.addEventListener("circle:receipt-split", onReceiptSplit);
    window.addEventListener("circle:circle-aura", onAura);
    window.addEventListener("circle:whisper-mode", onWhisper);
    window.addEventListener("circle:circle-lens", onLens);
    window.addEventListener("circle:live-translate", onLiveTranslate);
    window.addEventListener("circle:group-memory", onGroupMemory);
    window.addEventListener("circle:vibe-match", onVibeMatch);
    window.addEventListener("circle:ai-recap", onAiRecap);
    window.addEventListener("circle:universal-story", onUniversalStory);
    window.addEventListener("circle:vessel-tracker", onVesselTracker);
    window.addEventListener("circle:smart-inbox", onSmartInbox);
    window.addEventListener("circle:mood-chat", onMoodChat);
    window.addEventListener("circle:voice-clone", onVoiceClone);
    window.addEventListener("circle:tribe-chat", onTribeChat);
    window.addEventListener("circle:ai-mediator", onAiMediator);
    window.addEventListener("circle:note-self", onNoteSelf);
    window.addEventListener("circle:word-aura", onWordAura);
    window.addEventListener("circle:chat-maze", onChatMaze);
    window.addEventListener("circle:ghost-inbox", onGhostInbox);
    window.addEventListener("circle:citizen-shield", onCitizenShield);
    window.addEventListener("circle:ai-director", onAidirector);
    window.addEventListener("circle:co-watch", onCowatch);
    window.addEventListener("circle:color-story", onColorstory);
    window.addEventListener("circle:debate-arena", onDebatearena);
    window.addEventListener("circle:echo-breaker", onEchobreaker);
    window.addEventListener("circle:echo-remix", onEchoremix);
    window.addEventListener("circle:lamahat-viewer", onLamahatviewer);
    window.addEventListener("circle:living-photos", onLivingphotos);
    window.addEventListener("circle:mashahd-player", onMashahdplayer);
    window.addEventListener("circle:mesh-presence", onMeshpresence);
    window.addEventListener("circle:mood-player", onMoodplayer);
    window.addEventListener("circle:mosaic-stories", onMosaicstories);
    window.addEventListener("circle:photo-genealogy", onPhotogenealogy);
    window.addEventListener("circle:smart-chapters", onSmartchapters);
    window.addEventListener("circle:thread-theatre", onThreadtheatre);
    window.addEventListener("circle:time-shift-cam", onTimeshiftcam);
    window.addEventListener("circle:topic-dna", onTopicdna);
    window.addEventListener("circle:word-garden", onWordgarden);
    const onAddContact = () => setAddContactOpen(true);
    const onContactQr = () => setContactQrOpen(true);
    const onInstitutionRegister = () => setInstitutionRegisterOpen(true);
    window.addEventListener("circle:add-contact", onAddContact);
    window.addEventListener("circle:contact-qr", onContactQr);
    window.addEventListener("circle:institution-register", onInstitutionRegister);

    // Cirkle Brain AI features
    const onCommit = () => setCommitOpen(true);
    const onSentinel = () => setSentinelOpen(true);
    const onOracle = () => setOracleOpen(true);
    const onSpark = () => setSparkOpen(true);
    const onCreate = () => setCreateOpen(true);
    const onLearn = () => setLearnOpen(true);
    const onGrow = () => setGrowOpen(true);
    const onCare = () => setCareOpen(true);
    window.addEventListener("circle:commit", onCommit);
    window.addEventListener("circle:cirkle-commit", onCommit);
    window.addEventListener("circle:sentinel", onSentinel);
    window.addEventListener("circle:oracle", onOracle);
    window.addEventListener("circle:spark", onSpark);
    window.addEventListener("circle:create", onCreate);
    window.addEventListener("circle:learn", onLearn);
    window.addEventListener("circle:grow", onGrow);
    window.addEventListener("circle:care", onCare);
    const onDna = () => setDnaOpen(true);
    const onMood = () => setMoodOpen(true);
    const onTimeShift = () => setTimeOpen(true);
    const onVerse = () => setVerseOpen(true);
    const onCirkleShield = () => setCirkleShieldOpen(true);
    const onMint = () => setMintOpen(true);
    const onVisaExplorer = () => setVisaExplorerOpen(true);
    window.addEventListener("circle:dna", onDna);
    window.addEventListener("circle:mood", onMood);
    window.addEventListener("circle:time-shift", onTimeShift);
    window.addEventListener("circle:verse", onVerse);
    window.addEventListener("circle:cirkle-shield", onCirkleShield);
    window.addEventListener("circle:mint", onMint);
    window.addEventListener("circle:visa-explorer", onVisaExplorer);

    const onOverlayBrowser = () => setOverlayBrowserOpen(true);
    window.addEventListener("circle:overlay-browser", onOverlayBrowser);

    const onPersonalAI = () => setPersonalAIOpen(true);
    window.addEventListener("circle:personal-ai", onPersonalAI);

    const onMeshDashboard = () => setMeshDashboardOpen(true);
    window.addEventListener("circle:mesh-dashboard", onMeshDashboard);

    const onOracleMarkets = () => setOracleMarketsOpen(true);
    window.addEventListener("circle:oracle-markets", onOracleMarkets);

    const onCreatorStudio = () => setCreatorStudioOpen(true);
    window.addEventListener("circle:creator-studio", onCreatorStudio);

    const onCirkleIdentity = () => setCirkleIdentityOpen(true);
    window.addEventListener("circle:identity", onCirkleIdentity);

    const onShieldDashboard = () => setShieldDashboardOpen(true);
    window.addEventListener("circle:shield-dashboard", onShieldDashboard);

    const onDataResidency = () => setDataResidencyOpen(true);
    window.addEventListener("circle:data-residency", onDataResidency);

    // ── VoIP / Bot Developer overlays ─────────────────────────────
    // `circle:start-call` opens the CallScreen overlay AND triggers an
    // outgoing call (the overlay handles it directly via the callManager).
    // `circle:open-call-screen` opens the overlay WITHOUT triggering a call
    // (used by wasl-screen's incoming-call listener so the overlay can read
    // the buffered incoming payload from callManager on mount).
    const onOpenCallScreen = () => setCallScreenOpen(true);
    window.addEventListener("circle:start-call", onOpenCallScreen);
    window.addEventListener("circle:open-call-screen", onOpenCallScreen);

    const onBotDeveloper = () => setBotDeveloperOpen(true);
    window.addEventListener("circle:bot-developer", onBotDeveloper);

    // ── Blueprint BLUEPRINT-2 features ────────────────────────────
    const onAdStudio = () => setAdStudioOpen(true);
    window.addEventListener("circle:ad-studio", onAdStudio);

    const onCirkleGradebook = () => setCirkleGradebookOpen(true);
    window.addEventListener("circle:cirkle-gradebook", onCirkleGradebook);

    const onKnowledgeWiki = () => setKnowledgeWikiOpen(true);
    window.addEventListener("circle:knowledge-wiki", onKnowledgeWiki);

    // ── Blueprint §14 / §20 / §23: Pro Network, Cirkle Maps, Circle Mail ──
    const onProNetwork = () => setProNetworkOpen(true);
    const onCirkleMaps = () => setCirkleMapsOpen(true);
    const onCircleMail = () => setCircleMailOpen(true);
    window.addEventListener("circle:pro-network", onProNetwork);
    window.addEventListener("circle:cirkle-maps", onCirkleMaps);
    window.addEventListener("circle:circle-mail", onCircleMail);

    // ── Blueprint round 3: Bullet Comments, Family Vault, Ticket Mint, Phone Migrate ──
    const onBulletComments = () => setBulletCommentsOpen(true);
    const onFamilyVault = () => setFamilyVaultOpen(true);
    const onTicketMint = () => setTicketMintOpen(true);
    const onPhoneMigrate = () => setPhoneMigrateOpen(true);
    window.addEventListener("circle:bullet-comments", onBulletComments);
    window.addEventListener("circle:family-vault", onFamilyVault);
    window.addEventListener("circle:ticket-mint", onTicketMint);
    window.addEventListener("circle:phone-migrate", onPhoneMigrate);

    // ── Brain Orchestrator ───────────────────────────────────────
    const onOrchestrator = () => setOrchestratorOpen(true);
    window.addEventListener("circle:orchestrator", onOrchestrator);

    // ── Wasl blueprint overlays ──────────────────────────────────
    const onBroadcast = () => setBroadcastOpen(true);
    const onGifPicker = () => setGifPickerOpen(true);
    const onWorkMode = () => setWorkModeOpen(true);
    const onDeviceVerify = () => setDeviceVerifyOpen(true);
    const onAdminPanel = () => setAdminPanelOpen(true);
    window.addEventListener("circle:broadcast-channel", onBroadcast);
    window.addEventListener("circle:gif-picker", onGifPicker);
    window.addEventListener("circle:work-mode", onWorkMode);
    window.addEventListener("circle:admin-panel", onAdminPanel);
    window.addEventListener("circle:device-verify", onDeviceVerify);

    // ── Personal Memory Brain ─────────────────────────────────────
    const onMemory = () => setMemoryDashboardOpen(true);
    window.addEventListener("circle:memory", onMemory);

    // ── Transparency / Performance / Comparison dashboards ───────
    const onTransparencyDashboard = () => setTransparencyDashboardOpen(true);
    const onPerformanceDashboard = () => setPerformanceDashboardOpen(true);
    const onComparisonView = () => setComparisonViewOpen(true);
    window.addEventListener("circle:transparency-dashboard", onTransparencyDashboard);
    window.addEventListener("circle:performance-dashboard", onPerformanceDashboard);
    window.addEventListener("circle:comparison-view", onComparisonView);

    // ── CREATIVE-1: Smart social overlays ─────────────────────────────
    const onSmartCompose = () => setSmartComposeOpen(true);
    const onSocialAnalytics = () => setSocialAnalyticsOpen(true);
    const onSmartNotifications = () => setSmartNotificationsOpen(true);
    window.addEventListener("circle:smart-compose", onSmartCompose);
    window.addEventListener("circle:social-analytics", onSocialAnalytics);
    window.addEventListener("circle:smart-notifications", onSmartNotifications);

    // ── CREATIVE-2: More creative social overlays ────────────────────
    const onConnectionGraph = () => setConnectionGraphOpen(true);
    const onContentCalendar = () => setContentCalendarOpen(true);
    const onContentDiscovery = () => setContentDiscoveryOpen(true);
    window.addEventListener("circle:connection-graph", onConnectionGraph);
    window.addEventListener("circle:content-calendar", onContentCalendar);
    window.addEventListener("circle:content-discovery", onContentDiscovery);

    // ── Legal / privacy overlays ────────────────────────────────
    const onPrivacyPolicy = () => setPrivacyPolicyOpen(true);
    const onTerms = () => setTermsOpen(true);
    const onDSR = () => setDsrOpen(true);
    window.addEventListener("circle:privacy-policy", onPrivacyPolicy);
    window.addEventListener("circle:terms", onTerms);
    window.addEventListener("circle:dsr-request", onDSR);
    const onWhatsNew = () => setWhatsNewOpen(true);
    window.addEventListener("circle:whats-new", onWhatsNew);
    // P1.7 — Circle Groups UX. The create flow + detail view are
    // reachable from any surface via these CustomEvents.
    const onCircleCreate = () => setCircleCreateOpen(true);
    const onCircleDetail = (e: Event & { detail?: { circleId?: string } }) => {
      if (e.detail?.circleId) setCircleDetailId(e.detail.circleId);
    };
    window.addEventListener("circle:create-circle", onCircleCreate);
    window.addEventListener("circle:circle-detail", onCircleDetail as any);

    window.addEventListener("circle:navigate", onNavigate as any);

    // ── News social sharing handlers ────────────────────────────
    const onShareWasl = (e: Event & { detail?: { title?: string; url?: string; source?: string } }) => {
      const d = e.detail || {};
      const text = `📰 ${d.title || ""}\nvia ${d.source || "Cirkle News"}\n${d.url || ""}`;
      setTab("wasl");
      // Pre-fill the Wasl chat input via a custom event
      setTimeout(() => window.dispatchEvent(new CustomEvent("wasl:prefill", { detail: { text } })), 300);
      toast.success("Shared to Wasl", { description: "Article link ready to send" });
    };
    const onShareMidan = (e: Event & { detail?: { title?: string; url?: string; source?: string } }) => {
      const d = e.detail || {};
      const text = `📰 ${d.title || ""}\nvia ${d.source || "Cirkle News"}\n${d.url || ""}`;
      setTab("midan");
      setComposer({ open: true, kind: "post", draft: text, anonymous: false, circleId: undefined });
      toast.success("Shared to Midan", { description: "Create a post with this article" });
    };
    window.addEventListener("share-to-wasl", onShareWasl as any);
    window.addEventListener("share-to-midan", onShareMidan as any);
    // ── TIER B+A+E overlay events (19) ──
    const onMessageReactions = () => setMessageReactionsOpen(true);
    const onEditHistory = () => setEditHistoryOpen(true);
    const onReplyThread = () => setReplyThreadOpen(true);
    const onDisappearing = () => setDisappearingOpen(true);
    const onScheduledMessages = () => setScheduledMessagesOpen(true);
    const onWebrtcCall = () => setWebrtcCallOpen(true);
    const onVoiceRecorder = () => setVoiceRecorderOpen(true);
    const onGroupVideoCall = () => setGroupVideoCallOpen(true);
    const onVoiceRoom = () => setVoiceRoomOpen(true);
    const onMeetingNotes2 = () => setMeetingNotesOpen(true);
    const onVoiceCloneStudio = () => setVoiceCloneStudioOpen(true);
    const onSmartReply = () => setSmartReplyOpen(true);
    const onUniversalShare = () => setUniversalShareOpen(true);
    const onAiCatchUp = () => setAiCatchUpOpen(true);
    const onSmartNotificationsV2 = () => setSmartNotificationsV2Open(true);
    const onToneAdjuster = () => setToneAdjusterOpen(true);
    const onConversationStarters = () => setConversationStartersOpen(true);
    const onFriendshipHealth = () => setFriendshipHealthOpen(true);
    const onActionItems = () => setActionItemsOpen(true);
    window.addEventListener("circle:message-reactions", onMessageReactions);
    window.addEventListener("circle:edit-history", onEditHistory);
    window.addEventListener("circle:reply-thread", onReplyThread);
    window.addEventListener("circle:disappearing-messages", onDisappearing);
    window.addEventListener("circle:scheduled-messages", onScheduledMessages);
    window.addEventListener("circle:webrtc-call", onWebrtcCall);
    window.addEventListener("circle:voice-recorder", onVoiceRecorder);
    window.addEventListener("circle:group-video-call", onGroupVideoCall);
    window.addEventListener("circle:voice-room", onVoiceRoom);
    window.addEventListener("circle:meeting-notes", onMeetingNotes2);
    window.addEventListener("circle:voice-clone-studio", onVoiceCloneStudio);
    window.addEventListener("circle:smart-reply", onSmartReply);
    window.addEventListener("circle:universal-share", onUniversalShare);
    window.addEventListener("circle:ai-catch-up", onAiCatchUp);
    window.addEventListener("circle:smart-notifications-v2", onSmartNotificationsV2);
    window.addEventListener("circle:ai-tone-adjuster", onToneAdjuster);
    window.addEventListener("circle:ai-conversation-starters", onConversationStarters);
    window.addEventListener("circle:ai-friendship-health", onFriendshipHealth);
    window.addEventListener("circle:ai-action-items", onActionItems);
    // ── TIER D+F overlay events (10) ──
    const onVerifiedBadge = () => setVerifiedBadgeOpen(true);
    const onCommitTemplates = () => setCommitTemplatesOpen(true);
    const onPremiumFeatures = () => setPremiumFeaturesOpen(true);
    const onChatFolders = () => setChatFoldersOpen(true);
    const onSavedMessages = () => setSavedMessagesOpen(true);
    const onMessageSearch = () => setMessageSearchOpen(true);
    const onStoryStatus = () => setStoryStatusOpen(true);
    const onAppLock = () => setAppLockOpen(true);
    const onLiveLocation = () => setLiveLocationOpen(true);
    const onPollCreator = () => setPollCreatorOpen(true);
    window.addEventListener("circle:verified-badge-apply", onVerifiedBadge);
    window.addEventListener("circle:commit-templates", onCommitTemplates);
    window.addEventListener("circle:premium-features", onPremiumFeatures);
    window.addEventListener("circle:chat-folders", onChatFolders);
    window.addEventListener("circle:saved-messages", onSavedMessages);
    window.addEventListener("circle:message-search", onMessageSearch);
    window.addEventListener("circle:story-status", onStoryStatus);
    window.addEventListener("circle:app-lock", onAppLock);
    window.addEventListener("circle:live-location", onLiveLocation);
    window.addEventListener("circle:poll-creator", onPollCreator);
    // ── ACA + FED + EMERGENCY + EVIDENCE/AI/POLICY events (12) ──
    const onAcaLogin = () => setAcaLoginOpen(true);
    const onAcaDashboard = () => setAcaDashboardOpen(true);
    const onAcaCaseDetail = () => setAcaCaseDetailOpen(true);
    const onInstitutionRegistry = () => setInstitutionRegistryOpen(true);
    const onInterAgencyReferral = () => setInterAgencyReferralOpen(true);
    const onServiceDirectory = () => setServiceDirectoryOpen(true);
    const onSmartRouting = () => setSmartRoutingOpen(true);
    const onEmergencyRouting = () => setEmergencyRoutingOpen(true);
    const onServiceOutage = () => setServiceOutageOpen(true);
    const onEvidenceVault = () => setEvidenceVaultOpen(true);
    const onAiGovernance = () => setAiGovernanceOpen(true);
    const onPolicyEngine = () => setPolicyEngineOpen(true);
    window.addEventListener("circle:aca-login", onAcaLogin);
    window.addEventListener("circle:aca-dashboard", onAcaDashboard);
    window.addEventListener("circle:aca-case-detail", onAcaCaseDetail);
    window.addEventListener("circle:institution-registry", onInstitutionRegistry);
    window.addEventListener("circle:inter-agency-referral", onInterAgencyReferral);
    window.addEventListener("circle:service-directory", onServiceDirectory);
    window.addEventListener("circle:smart-routing", onSmartRouting);
    window.addEventListener("circle:emergency-routing", onEmergencyRouting);
    window.addEventListener("circle:service-outage-report", onServiceOutage);
    window.addEventListener("circle:evidence-vault", onEvidenceVault);
    window.addEventListener("circle:ai-governance", onAiGovernance);
    window.addEventListener("circle:policy-engine", onPolicyEngine);
    return () => {
      window.removeEventListener("circle:composer", onComposer as any);
      window.removeEventListener("circle:governance", onGovernance);
      window.removeEventListener("circle:settings", onSettings);
      window.removeEventListener("circle:ai", onAi);
      window.removeEventListener("circle:hub", onHub);
      window.removeEventListener("circle:pulse", onPulse);
      window.removeEventListener("circle:time-capsule", onTimeCapsule);
      window.removeEventListener("circle:mood-feed", onMoodFeed);
      window.removeEventListener("circle:privacy-shield", onPrivacyShield);
      window.removeEventListener("circle:receipt-split", onReceiptSplit);
      window.removeEventListener("circle:circle-aura", onAura);
      window.removeEventListener("circle:whisper-mode", onWhisper);
      window.removeEventListener("circle:circle-lens", onLens);
      window.removeEventListener("circle:live-translate", onLiveTranslate);
      window.removeEventListener("circle:group-memory", onGroupMemory);
      window.removeEventListener("circle:vibe-match", onVibeMatch);
      window.removeEventListener("circle:ai-recap", onAiRecap);
      window.removeEventListener("circle:universal-story", onUniversalStory);
      window.removeEventListener("circle:vessel-tracker", onVesselTracker);
      window.removeEventListener("circle:smart-inbox", onSmartInbox);
      window.removeEventListener("circle:mood-chat", onMoodChat);
      window.removeEventListener("circle:voice-clone", onVoiceClone);
      window.removeEventListener("circle:tribe-chat", onTribeChat);
      window.removeEventListener("circle:ai-mediator", onAiMediator);
      window.removeEventListener("circle:note-self", onNoteSelf);
      window.removeEventListener("circle:word-aura", onWordAura);
      window.removeEventListener("circle:chat-maze", onChatMaze);
      window.removeEventListener("circle:ghost-inbox", onGhostInbox);
      window.removeEventListener("circle:citizen-shield", onCitizenShield);
      window.removeEventListener("circle:ai-director", onAidirector);
      window.removeEventListener("circle:co-watch", onCowatch);
      window.removeEventListener("circle:color-story", onColorstory);
      window.removeEventListener("circle:debate-arena", onDebatearena);
      window.removeEventListener("circle:echo-breaker", onEchobreaker);
      window.removeEventListener("circle:echo-remix", onEchoremix);
      window.removeEventListener("circle:lamahat-viewer", onLamahatviewer);
      window.removeEventListener("circle:living-photos", onLivingphotos);
      window.removeEventListener("circle:mashahd-player", onMashahdplayer);
      window.removeEventListener("circle:mesh-presence", onMeshpresence);
      window.removeEventListener("circle:mood-player", onMoodplayer);
      window.removeEventListener("circle:mosaic-stories", onMosaicstories);
      window.removeEventListener("circle:photo-genealogy", onPhotogenealogy);
      window.removeEventListener("circle:smart-chapters", onSmartchapters);
      window.removeEventListener("circle:thread-theatre", onThreadtheatre);
      window.removeEventListener("circle:time-shift-cam", onTimeshiftcam);
      window.removeEventListener("circle:topic-dna", onTopicdna);
      window.removeEventListener("circle:word-garden", onWordgarden);
      window.removeEventListener("circle:add-contact", onAddContact);
      window.removeEventListener("circle:contact-qr", onContactQr);
      window.removeEventListener("circle:institution-register", onInstitutionRegister);
      window.removeEventListener("circle:commit", onCommit);
      window.removeEventListener("circle:cirkle-commit", onCommit);
      window.removeEventListener("circle:sentinel", onSentinel);
      window.removeEventListener("circle:oracle", onOracle);
      window.removeEventListener("circle:spark", onSpark);
      window.removeEventListener("circle:create", onCreate);
      window.removeEventListener("circle:learn", onLearn);
      window.removeEventListener("circle:grow", onGrow);
      window.removeEventListener("circle:care", onCare);
      window.removeEventListener("circle:dna", onDna);
      window.removeEventListener("circle:mood", onMood);
      window.removeEventListener("circle:time-shift", onTimeShift);
      window.removeEventListener("circle:verse", onVerse);
      window.removeEventListener("circle:cirkle-shield", onCirkleShield);
      window.removeEventListener("circle:mint", onMint);
      window.removeEventListener("circle:visa-explorer", onVisaExplorer);

      window.removeEventListener("circle:overlay-browser", onOverlayBrowser);
      window.removeEventListener("circle:personal-ai", onPersonalAI);
      window.removeEventListener("circle:mesh-dashboard", onMeshDashboard);
      window.removeEventListener("circle:oracle-markets", onOracleMarkets);
      window.removeEventListener("circle:creator-studio", onCreatorStudio);
      window.removeEventListener("circle:identity", onCirkleIdentity);
      window.removeEventListener("circle:shield-dashboard", onShieldDashboard);
      window.removeEventListener("circle:data-residency", onDataResidency);
      window.removeEventListener("circle:start-call", onOpenCallScreen);
      window.removeEventListener("circle:open-call-screen", onOpenCallScreen);
      window.removeEventListener("circle:bot-developer", onBotDeveloper);
      window.removeEventListener("circle:ad-studio", onAdStudio);
      window.removeEventListener("circle:cirkle-gradebook", onCirkleGradebook);
      window.removeEventListener("circle:knowledge-wiki", onKnowledgeWiki);
      window.removeEventListener("circle:pro-network", onProNetwork);
      window.removeEventListener("circle:cirkle-maps", onCirkleMaps);
      window.removeEventListener("circle:circle-mail", onCircleMail);
      window.removeEventListener("circle:bullet-comments", onBulletComments);
      window.removeEventListener("circle:family-vault", onFamilyVault);
      window.removeEventListener("circle:ticket-mint", onTicketMint);
      window.removeEventListener("circle:phone-migrate", onPhoneMigrate);
      window.removeEventListener("circle:orchestrator", onOrchestrator);
      window.removeEventListener("circle:broadcast-channel", onBroadcast);
      window.removeEventListener("circle:gif-picker", onGifPicker);
      window.removeEventListener("circle:work-mode", onWorkMode);
      window.removeEventListener("circle:device-verify", onDeviceVerify);
      window.removeEventListener("circle:admin-panel", onAdminPanel);
      window.removeEventListener("circle:memory", onMemory);
      window.removeEventListener("circle:transparency-dashboard", onTransparencyDashboard);
      window.removeEventListener("circle:performance-dashboard", onPerformanceDashboard);
      window.removeEventListener("circle:comparison-view", onComparisonView);
      // CREATIVE-1
      window.removeEventListener("circle:smart-compose", onSmartCompose);
      window.removeEventListener("circle:social-analytics", onSocialAnalytics);
      window.removeEventListener("circle:smart-notifications", onSmartNotifications);
      // CREATIVE-2
      window.removeEventListener("circle:connection-graph", onConnectionGraph);
      window.removeEventListener("circle:content-calendar", onContentCalendar);
      window.removeEventListener("circle:content-discovery", onContentDiscovery);
      window.removeEventListener("circle:privacy-policy", onPrivacyPolicy);
      window.removeEventListener("circle:terms", onTerms);
      window.removeEventListener("circle:dsr-request", onDSR);
      window.removeEventListener("circle:whats-new", onWhatsNew);
      window.removeEventListener("circle:create-circle", onCircleCreate);
      window.removeEventListener("circle:circle-detail", onCircleDetail as any);

      window.removeEventListener("circle:navigate", onNavigate as any);
      window.removeEventListener("share-to-wasl", onShareWasl as any);
      window.removeEventListener("share-to-midan", onShareMidan as any);
      window.removeEventListener("circle:message-reactions", onMessageReactions);
      window.removeEventListener("circle:edit-history", onEditHistory);
      window.removeEventListener("circle:reply-thread", onReplyThread);
      window.removeEventListener("circle:disappearing-messages", onDisappearing);
      window.removeEventListener("circle:scheduled-messages", onScheduledMessages);
      window.removeEventListener("circle:webrtc-call", onWebrtcCall);
      window.removeEventListener("circle:voice-recorder", onVoiceRecorder);
      window.removeEventListener("circle:group-video-call", onGroupVideoCall);
      window.removeEventListener("circle:voice-room", onVoiceRoom);
      window.removeEventListener("circle:meeting-notes", onMeetingNotes2);
      window.removeEventListener("circle:voice-clone-studio", onVoiceCloneStudio);
      window.removeEventListener("circle:smart-reply", onSmartReply);
      window.removeEventListener("circle:universal-share", onUniversalShare);
      window.removeEventListener("circle:ai-catch-up", onAiCatchUp);
      window.removeEventListener("circle:smart-notifications-v2", onSmartNotificationsV2);
      window.removeEventListener("circle:ai-tone-adjuster", onToneAdjuster);
      window.removeEventListener("circle:ai-conversation-starters", onConversationStarters);
      window.removeEventListener("circle:ai-friendship-health", onFriendshipHealth);
      window.removeEventListener("circle:ai-action-items", onActionItems);
      // ── TIER D+F cleanup (10) ──
      window.removeEventListener("circle:verified-badge-apply", onVerifiedBadge);
      window.removeEventListener("circle:commit-templates", onCommitTemplates);
      window.removeEventListener("circle:premium-features", onPremiumFeatures);
      window.removeEventListener("circle:chat-folders", onChatFolders);
      window.removeEventListener("circle:saved-messages", onSavedMessages);
      window.removeEventListener("circle:message-search", onMessageSearch);
      window.removeEventListener("circle:story-status", onStoryStatus);
      window.removeEventListener("circle:app-lock", onAppLock);
      window.removeEventListener("circle:live-location", onLiveLocation);
      window.removeEventListener("circle:poll-creator", onPollCreator);
      // ── ACA + FED + EMERGENCY + EVIDENCE/AI/POLICY cleanup (12) ──
      window.removeEventListener("circle:aca-login", onAcaLogin);
      window.removeEventListener("circle:aca-dashboard", onAcaDashboard);
      window.removeEventListener("circle:aca-case-detail", onAcaCaseDetail);
      window.removeEventListener("circle:institution-registry", onInstitutionRegistry);
      window.removeEventListener("circle:inter-agency-referral", onInterAgencyReferral);
      window.removeEventListener("circle:service-directory", onServiceDirectory);
      window.removeEventListener("circle:smart-routing", onSmartRouting);
      window.removeEventListener("circle:emergency-routing", onEmergencyRouting);
      window.removeEventListener("circle:service-outage-report", onServiceOutage);
      window.removeEventListener("circle:evidence-vault", onEvidenceVault);
      window.removeEventListener("circle:ai-governance", onAiGovernance);
      window.removeEventListener("circle:policy-engine", onPolicyEngine);
    };
  }, []);

  const handleAIAction = (a: AIAction) => {
    if (a.type === "open-composer") setComposer({ open: true, kind: a.kind, draft: a.draft, anonymous: false, circleId: undefined });
    else if (a.type === "open-governance") setGovernanceOpen(true);
    else if (a.type === "navigate") setTab(a.tab as TabId);
    else if (a.type === "scan-pay") { setTab("pay"); toast("Scan & Pay ready"); }
    else if (a.type === "toggle-ghost") toast.success("Ghost mode toggled");
  };

  const finishOnboarding = () => { setOnboarded(true); setShowOnboarding(false); };

  // Auth gate: show ONLY cinematic entrance (not AuthScreen) when splash is active.
  // When user clicks Register/Sign in, go DIRECTLY to the form (skip AuthScreen's splash).
  if (!authHydrated || !isAuthenticated) {
    if (showSplash) {
      return (
        <CinematicEntrance
          isAuthenticated={false}
          onContinue={() => {}}
          onRegister={() => { setAuthView("register"); setShowSplash(false); }}
          onSignIn={() => { setAuthView("login"); setShowSplash(false); }}
        />
      );
    }
    return <AuthScreen />;
  }

  // Authenticated user: if splash is showing, show ONLY the cinematic entrance.
  // The main app renders only after the user clicks "Continue".
  if (showSplash) {
    return (
      <CinematicEntrance
        isAuthenticated={true}
        onContinue={() => setShowSplash(false)}
        onRegister={() => {}}
        onSignIn={() => {}}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Single smooth aurora background — no split, no hard edges */}
      <div className="fixed inset-0 -z-10 aurora-bg opacity-25 pointer-events-none" />
      {/* Skip-to-content link — keyboard / screen-reader users can jump past
          the top bar + dock straight to the active screen. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-full focus:bg-background focus:border focus:border-border focus:shadow-float focus:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <div className="max-w-[1600px] mx-auto relative">
        <TopBar title={titles[tab]} onSearch={() => setPaletteOpen(true)} onSettings={() => setSettingsOpen(true)} />
        {/* Global offline banner — shown when navigator.onLine is false */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 mx-3 rounded-xl bg-accent/15 border border-accent/30 px-4 py-2 flex items-center gap-2 text-sm text-accent-foreground"
              role="alert"
              aria-live="assertive"
            >
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>You're offline. Some features may be unavailable — cached content is shown.</span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.main key={tab} id="main-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="pt-4 xl:px-4 focus:outline-none" tabIndex={-1}>
            <Screen />
          </motion.main>
        </AnimatePresence>
      </div>
      <AIOrb onClick={() => setAiOpen(true)} />
      {/* R5: Floating Post FAB — always accessible compose button */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("circle:composer", { detail: { kind: "post" } }))}
        className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-gold text-charcoal shadow-float flex items-center justify-center hover:scale-105 transition md:bottom-28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Create post"
      >
        <Plus className="w-6 h-6" aria-hidden />
      </button>
      {/* R5: Floating AI Insight Bar — rotating Brain AI suggestions above the dock */}
      <FloatingInsightBar onOpenAI={() => setAiOpen(true)} />
      <Dock active={tab} onChange={setTab} />
      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} onAction={handleAIAction} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GovernanceCenter open={governanceOpen} onClose={() => setGovernanceOpen(false)} />
      <CircleHub open={hubOpen} onClose={() => setHubOpen(false)} />
      <CirclePulse open={pulseOpen} onClose={() => setPulseOpen(false)} />
      <TimeCapsule open={timeCapsuleOpen} onClose={() => setTimeCapsuleOpen(false)} />
      <MoodFeed open={moodFeedOpen} onClose={() => setMoodFeedOpen(false)} />
      <PrivacyShield open={privacyShieldOpen} onClose={() => setPrivacyShieldOpen(false)} />
      <ReceiptSplit open={receiptSplitOpen} onClose={() => setReceiptSplitOpen(false)} />
      <CircleAura open={auraOpen} onClose={() => setAuraOpen(false)} />
      <WhisperMode open={whisperOpen} onClose={() => setWhisperOpen(false)} />
      <CircleLens open={lensOpen} onClose={() => setLensOpen(false)} />
      <LiveTranslate open={liveTranslateOpen} onClose={() => setLiveTranslateOpen(false)} />
      <GroupMemory open={groupMemoryOpen} onClose={() => setGroupMemoryOpen(false)} />
      <VibeMatch open={vibeMatchOpen} onClose={() => setVibeMatchOpen(false)} />
      <AIRecap open={aiRecapOpen} onClose={() => setAiRecapOpen(false)} />
      <UniversalStory open={universalStoryOpen} onClose={() => setUniversalStoryOpen(false)} />
      <VesselTracker open={vesselTrackerOpen} onClose={() => setVesselTrackerOpen(false)} />
      <SmartInbox open={smartInboxOpen} onClose={() => setSmartInboxOpen(false)} />
      <MoodChat open={moodChatOpen} onClose={() => setMoodChatOpen(false)} />
      <VoiceClone open={voiceCloneOpen} onClose={() => setVoiceCloneOpen(false)} />
      <TribeChat open={tribeChatOpen} onClose={() => setTribeChatOpen(false)} />
      <AIMediator open={aiMediatorOpen} onClose={() => setAiMediatorOpen(false)} />
      <NoteSelf open={noteSelfOpen} onClose={() => setNoteSelfOpen(false)} />
      <WordAura open={wordAuraOpen} onClose={() => setWordAuraOpen(false)} />
      <ChatMaze open={chatMazeOpen} onClose={() => setChatMazeOpen(false)} />
      <GhostInbox open={ghostInboxOpen} onClose={() => setGhostInboxOpen(false)} />
      <CitizenShield open={citizenShieldOpen} onClose={() => setCitizenShieldOpen(false)} />
      <AiDirector open={aidirectorOpen} onClose={() => setAidirectorOpen(false)} />
      <CoWatch open={cowatchOpen} onClose={() => setCowatchOpen(false)} />
      <ColorStory open={colorstoryOpen} onClose={() => setColorstoryOpen(false)} />
      <DebateArena open={debatearenaOpen} onClose={() => setDebatearenaOpen(false)} />
      <EchoBreaker open={echobreakerOpen} onClose={() => setEchobreakerOpen(false)} />
      <EchoRemix open={echoremixOpen} onClose={() => setEchoremixOpen(false)} />
      <LamahatViewer open={lamahatviewerOpen} mode="story" index={0} onClose={() => setLamahatviewerOpen(false)} />
      <LivingPhotos open={livingphotosOpen} onClose={() => setLivingphotosOpen(false)} />
      <MashahdPlayer open={mashahdplayerOpen} index={0} onClose={() => setMashahdplayerOpen(false)} />
      {meshpresenceOpen && <MeshPresence />}
      <MoodPlayer open={moodplayerOpen} onClose={() => setMoodplayerOpen(false)} />
      <MosaicStories open={mosaicstoriesOpen} onClose={() => setMosaicstoriesOpen(false)} />
      <PhotoGenealogy open={photogenealogyOpen} onClose={() => setPhotogenealogyOpen(false)} />
      <SmartChapters open={smartchaptersOpen} onClose={() => setSmartchaptersOpen(false)} />
      <ThreadTheatre open={threadtheatreOpen} onClose={() => setThreadtheatreOpen(false)} />
      <TimeShiftCam open={timeshiftcamOpen} onClose={() => setTimeshiftcamOpen(false)} />
      <TopicDNA open={topicdnaOpen} onClose={() => setTopicdnaOpen(false)} />
      <WordGarden open={wordgardenOpen} onClose={() => setWordgardenOpen(false)} />
      <AddContact open={addContactOpen} onClose={() => setAddContactOpen(false)} />
      <ContactQR open={contactQrOpen} onClose={() => setContactQrOpen(false)} username={user?.username || "cirkle"} displayName={user?.displayName || "Cirkle User"} />
      <InstitutionRegister open={institutionRegisterOpen} onClose={() => setInstitutionRegisterOpen(false)} />
      <CirkleCommit open={commitOpen} onClose={() => setCommitOpen(false)} />
      <CirkleSentinel open={sentinelOpen} onClose={() => setSentinelOpen(false)} />
      <CirkleOracle open={oracleOpen} onClose={() => setOracleOpen(false)} />
      <CirkleSpark open={sparkOpen} onClose={() => setSparkOpen(false)} />
      <CirkleCreate open={createOpen} onClose={() => setCreateOpen(false)} />
      <CirkleLearn open={learnOpen} onClose={() => setLearnOpen(false)} />
      <CirkleGrow open={growOpen} onClose={() => setGrowOpen(false)} />
      <CirkleCare open={careOpen} onClose={() => setCareOpen(false)} />
      <CirkleDNA open={dnaOpen} onClose={() => setDnaOpen(false)} />
      <CirkleMood open={moodOpen} onClose={() => setMoodOpen(false)} />
      <CirkleTime open={timeOpen} onClose={() => setTimeOpen(false)} />
      <CirkleVerse open={verseOpen} onClose={() => setVerseOpen(false)} />
      <CirkleShield open={cirkleShieldOpen} onClose={() => setCirkleShieldOpen(false)} />
      <CirkleMint open={mintOpen} onClose={() => setMintOpen(false)} />
      <VisaExplorer open={visaExplorerOpen} onClose={() => setVisaExplorerOpen(false)} passportCountry={country} />

      <OverlayBrowser open={overlayBrowserOpen} onClose={() => setOverlayBrowserOpen(false)} />

      <PersonalAIOS open={personalAIOpen} onClose={() => setPersonalAIOpen(false)} />

      <MeshDashboard open={meshDashboardOpen} onClose={() => setMeshDashboardOpen(false)} />
      <OracleMarkets open={oracleMarketsOpen} onClose={() => setOracleMarketsOpen(false)} />

      <CreatorStudio open={creatorStudioOpen} onClose={() => setCreatorStudioOpen(false)} />

      <CirkleIdentity open={cirkleIdentityOpen} onClose={() => setCirkleIdentityOpen(false)} />
      <ShieldDashboard open={shieldDashboardOpen} onClose={() => setShieldDashboardOpen(false)} />

      <DataResidency open={dataResidencyOpen} onClose={() => setDataResidencyOpen(false)} />

      {/* VoIP + Bot Developer overlays */}
      <CallScreen open={callScreenOpen} onClose={() => setCallScreenOpen(false)} />
      <BotDeveloper open={botDeveloperOpen} onClose={() => setBotDeveloperOpen(false)} />

      {/* Blueprint BLUEPRINT-2: Local Ads, Education, Wiki */}
      <AdStudio open={adStudioOpen} onClose={() => setAdStudioOpen(false)} />
      <CirkleGradebook open={cirkleGradebookOpen} onClose={() => setCirkleGradebookOpen(false)} />
      <KnowledgeWiki open={knowledgeWikiOpen} onClose={() => setKnowledgeWikiOpen(false)} />

      {/* Blueprint §14 / §20 / §23 pillars */}
      <ProNetwork open={proNetworkOpen} onClose={() => setProNetworkOpen(false)} />
      <CirkleMaps open={cirkleMapsOpen} onClose={() => setCirkleMapsOpen(false)} />
      <CircleMail open={circleMailOpen} onClose={() => setCircleMailOpen(false)} />

      {/* Blueprint round 3: Bullet Comments, Family Vault, Ticket Mint, Phone Migrate */}
      <BulletComments open={bulletCommentsOpen} onClose={() => setBulletCommentsOpen(false)} />
      <FamilyVault open={familyVaultOpen} onClose={() => setFamilyVaultOpen(false)} />
      <TicketMint open={ticketMintOpen} onClose={() => setTicketMintOpen(false)} />
      <PhoneMigrate open={phoneMigrateOpen} onClose={() => setPhoneMigrateOpen(false)} />
      <BrainOrchestrator open={orchestratorOpen} onClose={() => setOrchestratorOpen(false)} />
      <BroadcastChannel open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
      <GifPicker open={gifPickerOpen} onClose={() => setGifPickerOpen(false)} />
      <WorkMode open={workModeOpen} onClose={() => setWorkModeOpen(false)} />
      <DeviceVerify open={deviceVerifyOpen} onClose={() => setDeviceVerifyOpen(false)} />
      <AdminPanel open={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
      <MemoryDashboard open={memoryDashboardOpen} onClose={() => setMemoryDashboardOpen(false)} />

      {/* Blueprint §3.10 / §5.7 / §1.7 dashboards */}
      <TransparencyDashboard open={transparencyDashboardOpen} onClose={() => setTransparencyDashboardOpen(false)} />
      <PerformanceDashboard open={performanceDashboardOpen} onClose={() => setPerformanceDashboardOpen(false)} />
      <ComparisonView open={comparisonViewOpen} onClose={() => setComparisonViewOpen(false)} />

      {/* CREATIVE-1: Smart social overlays (AI composer + analytics + notifications) */}
      <SmartCompose open={smartComposeOpen} onClose={() => setSmartComposeOpen(false)} />
      <SocialAnalytics open={socialAnalyticsOpen} onClose={() => setSocialAnalyticsOpen(false)} />
      <SmartNotifications open={smartNotificationsOpen} onClose={() => setSmartNotificationsOpen(false)} />

      {/* CREATIVE-2: More creative social overlays (graph + calendar + discovery) */}
      <ConnectionGraph open={connectionGraphOpen} onClose={() => setConnectionGraphOpen(false)} />
      <ContentCalendar open={contentCalendarOpen} onClose={() => setContentCalendarOpen(false)} />
      <ContentDiscovery open={contentDiscoveryOpen} onClose={() => setContentDiscoveryOpen(false)} />

      {/* Legal / privacy overlays */}
      <PrivacyPolicy open={privacyPolicyOpen} onClose={() => setPrivacyPolicyOpen(false)} />
      <TermsOfService open={termsOpen} onClose={() => setTermsOpen(false)} />
      <DSRRequest open={dsrOpen} onClose={() => setDsrOpen(false)} />

      {/* P0.4: What's New — feature discoverability overlay */}
      <WhatsNew open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
      {/* ── TIER B+A+E overlays (19) ── */}
      <MessageReactions open={messageReactionsOpen} onClose={() => setMessageReactionsOpen(false)} />
      <MessageEditHistory open={editHistoryOpen} onClose={() => setEditHistoryOpen(false)} />
      <ReplyThread open={replyThreadOpen} onClose={() => setReplyThreadOpen(false)} />
      <DisappearingMessages open={disappearingOpen} onClose={() => setDisappearingOpen(false)} />
      <ScheduledMessages open={scheduledMessagesOpen} onClose={() => setScheduledMessagesOpen(false)} />
      {/* <WebRTCCall open={webrtcCallOpen} onClose={() => setWebrtcCallOpen(false)} /> */}
      {/* <VoiceMessageRecorder open={voiceRecorderOpen} onClose={() => setVoiceRecorderOpen(false)} /> */}
      {/* <GroupVideoCall open={groupVideoCallOpen} onClose={() => setGroupVideoCallOpen(false)} /> */}
      <VoiceRoom open={voiceRoomOpen} onClose={() => setVoiceRoomOpen(false)} />
      <MeetingNotesOverlay open={meetingNotesOpen} onClose={() => setMeetingNotesOpen(false)} />
      {/* <VoiceCloneStudio open={voiceCloneStudioOpen} onClose={() => setVoiceCloneStudioOpen(false)} /> */}
      <SmartReplyChips open={smartReplyOpen} onClose={() => setSmartReplyOpen(false)} />
      <UniversalShareSheet open={universalShareOpen} onClose={() => setUniversalShareOpen(false)} />
      <AICatchUp open={aiCatchUpOpen} onClose={() => setAiCatchUpOpen(false)} />
      <SmartNotificationsV2 open={smartNotificationsV2Open} onClose={() => setSmartNotificationsV2Open(false)} />
      <AIToneAdjuster open={toneAdjusterOpen} onClose={() => setToneAdjusterOpen(false)} />
      <AIConversationStarters open={conversationStartersOpen} onClose={() => setConversationStartersOpen(false)} />
      <AIFriendshipHealth open={friendshipHealthOpen} onClose={() => setFriendshipHealthOpen(false)} />
      <AIActionItems open={actionItemsOpen} onClose={() => setActionItemsOpen(false)} />
      {/* ── TIER D+F overlays (10) ── */}
      <VerifiedBadgeApply open={verifiedBadgeOpen} onClose={() => setVerifiedBadgeOpen(false)} />
      <CommitTemplatesOverlay open={commitTemplatesOpen} onClose={() => setCommitTemplatesOpen(false)} />
      <PremiumFeatures open={premiumFeaturesOpen} onClose={() => setPremiumFeaturesOpen(false)} />
      <ChatFolders open={chatFoldersOpen} onClose={() => setChatFoldersOpen(false)} />
      <SavedMessages open={savedMessagesOpen} onClose={() => setSavedMessagesOpen(false)} />
      <MessageSearch open={messageSearchOpen} onClose={() => setMessageSearchOpen(false)} />
      <StoryStatus open={storyStatusOpen} onClose={() => setStoryStatusOpen(false)} />
      <AppLock open={appLockOpen} onClose={() => setAppLockOpen(false)} />
      <LiveLocation open={liveLocationOpen} onClose={() => setLiveLocationOpen(false)} />
      <PollCreator open={pollCreatorOpen} onClose={() => setPollCreatorOpen(false)} />
      {/* ── ACA + FED + EMERGENCY + EVIDENCE/AI/POLICY overlays (12) ── */}
      <AcaLogin open={acaLoginOpen} onClose={() => setAcaLoginOpen(false)} />
      <AcaDashboard open={acaDashboardOpen} onClose={() => setAcaDashboardOpen(false)} />
      <AcaCaseDetail open={acaCaseDetailOpen} onClose={() => setAcaCaseDetailOpen(false)} />
      <GovernmentInstitutionRegistry open={institutionRegistryOpen} onClose={() => setInstitutionRegistryOpen(false)} />
      <InterAgencyReferralOvl open={interAgencyReferralOpen} onClose={() => setInterAgencyReferralOpen(false)} />
      <ServiceDirectory open={serviceDirectoryOpen} onClose={() => setServiceDirectoryOpen(false)} />
      <SmartRouting open={smartRoutingOpen} onClose={() => setSmartRoutingOpen(false)} />
      <EmergencyRouting open={emergencyRoutingOpen} onClose={() => setEmergencyRoutingOpen(false)} />
      <ServiceOutageReport open={serviceOutageOpen} onClose={() => setServiceOutageOpen(false)} />
      <EvidenceVault open={evidenceVaultOpen} onClose={() => setEvidenceVaultOpen(false)} />
      <AIGovernancePanel open={aiGovernanceOpen} onClose={() => setAiGovernanceOpen(false)} />
      <PolicyEngineOverlay open={policyEngineOpen} onClose={() => setPolicyEngineOpen(false)} />

      {/* P1.7 — Circle Groups: creation flow + detail view. Reachable
          from any surface via `circle:create-circle` and
          `circle:circle-detail` (with `{ detail: { circleId } }`). */}
      <CircleGroupCreate
        open={circleCreateOpen}
        onClose={() => setCircleCreateOpen(false)}
        onCreated={(id) => {
          setCircleCreateOpen(false);
          setCircleDetailId(id);
        }}
      />
      <CircleGroupDetail
        open={!!circleDetailId}
        circleId={circleDetailId}
        onClose={() => setCircleDetailId(null)}
      />

      {/* Cookie consent banner — always mounted so it can show on first visit. */}
      <CookieConsentBanner />

      <Composer
        open={composer.open}
        initialKind={composer.kind}
        initialText={composer.draft}
        anonymous={composer.anonymous}
        circleId={composer.circleId}
        onClose={() => setComposer({ open: false })}
      />
      <AnimatePresence>{showOnboarding && <Onboarding onDone={finishOnboarding} />}</AnimatePresence>
      <FirstLaunchTour
        open={showTour}
        onNavigateTab={setTab}
        onComplete={() => closeTour(true)}
        onSkip={() => closeTour(false)}
      />
    </div>
  );
}
