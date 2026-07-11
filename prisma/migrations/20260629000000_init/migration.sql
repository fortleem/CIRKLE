-- Cirkle Initial Migration
-- Compatible with SQLite (dev) and PostgreSQL (production).

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "arabicName" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT 'teal',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "region" TEXT NOT NULL DEFAULT 'EG',
    "joinedAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_circleId_key" ON "User"("circleId");

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'direct',
    "name" TEXT NOT NULL,
    "arabicName" TEXT,
    "avatarColor" TEXT NOT NULL DEFAULT 'teal',
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");

CREATE TABLE "ConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL DEFAULT 'teal',
    "initials" TEXT NOT NULL,
    "presence" TEXT NOT NULL DEFAULT 'offline',
    "joinedAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConversationMember_conversationId_displayName_key" ON "ConversationMember"("conversationId", "displayName");

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderName" TEXT NOT NULL,
    "senderInitials" TEXT NOT NULL,
    "senderColor" TEXT NOT NULL DEFAULT 'teal',
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "replyToId" TEXT,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorInitials" TEXT NOT NULL,
    "authorColor" TEXT NOT NULL DEFAULT 'teal',
    "authorHandle" TEXT NOT NULL,
    "authorVerified" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "arabicBody" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "module" TEXT NOT NULL DEFAULT 'midan',
    "location" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "mediaKind" TEXT,
    "mediaCount" INTEGER,
    "mediaCover" TEXT,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Post_module_createdAt_idx" ON "Post"("module", "createdAt");

CREATE TABLE "VerifyClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'verified',
    "attestor" TEXT NOT NULL,
    "issuedAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerifyClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userLabel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "counterpartyInitials" TEXT NOT NULL,
    "counterpartyColor" TEXT NOT NULL DEFAULT 'teal',
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "method" TEXT NOT NULL,
    "memo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'settled',
    "fee" REAL NOT NULL DEFAULT 0,
    "userId" TEXT,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

CREATE TABLE "TravelItinerary" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "startDate" TEXT NOT NULL,
    "travelers" INTEGER NOT NULL,
    "budget" TEXT NOT NULL,
    "interests" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TravelItinerary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "App" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "developer" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "logoEmoji" TEXT NOT NULL DEFAULT '🔌',
    "category" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'active',
    "scopes" TEXT NOT NULL DEFAULT 'feed:read',
    "redirectUris" TEXT NOT NULL DEFAULT '',
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "App_appId_key" ON "App"("appId");
CREATE INDEX "App_status_category_idx" ON "App"("status", "category");

CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "tier" TEXT NOT NULL DEFAULT 'free',
    "scopes" TEXT NOT NULL DEFAULT 'feed:read',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" DATETIME(3),
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 60,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiKey_keyId_key" ON "ApiKey"("keyId");
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_appId_status_idx" ON "ApiKey"("appId", "status");

CREATE TABLE "AppConnection" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userLabel" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "authCode" TEXT,
    "accessToken" TEXT,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AppConnection_appId_userLabel_key" ON "AppConnection"("appId", "userLabel");
CREATE UNIQUE INDEX "AppConnection_accessToken_key" ON "AppConnection"("accessToken");

CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookEvent_appId_status_idx" ON "WebhookEvent"("appId", "status");

ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VerifyClaim" ADD CONSTRAINT "VerifyClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppConnection" ADD CONSTRAINT "AppConnection_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
