CREATE TABLE "SpaceSettings" (
  "id" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "layoutType" TEXT NOT NULL DEFAULT 'Hybrid',
  "theme" TEXT NOT NULL DEFAULT 'Startup',
  "sizeRange" TEXT NOT NULL DEFAULT '1-10',
  "language" TEXT NOT NULL DEFAULT 'English',
  "colorMode" TEXT NOT NULL DEFAULT 'Light',
  "ambientAudioVideo" BOOLEAN NOT NULL DEFAULT true,
  "conversationRange" TEXT NOT NULL DEFAULT 'Short',
  "autoLockDesks" BOOLEAN NOT NULL DEFAULT true,
  "announcementsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "chatChannelsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "meetingChatEnabled" BOOLEAN NOT NULL DEFAULT true,
  "nearbyChatEnabled" BOOLEAN NOT NULL DEFAULT true,
  "directMessagesEnabled" BOOLEAN NOT NULL DEFAULT true,
  "companyEmailMembership" BOOLEAN NOT NULL DEFAULT false,
  "supportAccess" BOOLEAN NOT NULL DEFAULT true,
  "memberInvitesEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smartObjectsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpaceSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InviteLink" (
  "id" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'Member',
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeskAssignment" (
  "id" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "userId" TEXT,
  "label" TEXT NOT NULL,
  "teamName" TEXT NOT NULL DEFAULT 'Team',
  "x" INTEGER NOT NULL,
  "y" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeskAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpaceDraft" (
  "id" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "updatedById" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SpaceDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SmartObject" (
  "id" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'CUSTOM',
  "config" JSONB,
  "state" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SmartObject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpaceSettings_spaceId_key" ON "SpaceSettings"("spaceId");
CREATE UNIQUE INDEX "InviteLink_token_key" ON "InviteLink"("token");
CREATE INDEX "InviteLink_spaceId_idx" ON "InviteLink"("spaceId");
CREATE INDEX "InviteLink_token_idx" ON "InviteLink"("token");
CREATE INDEX "DeskAssignment_spaceId_idx" ON "DeskAssignment"("spaceId");
CREATE INDEX "DeskAssignment_userId_idx" ON "DeskAssignment"("userId");
CREATE INDEX "DeskAssignment_spaceId_x_y_idx" ON "DeskAssignment"("spaceId", "x", "y");
CREATE UNIQUE INDEX "SpaceDraft_spaceId_key" ON "SpaceDraft"("spaceId");
CREATE INDEX "SpaceDraft_updatedById_idx" ON "SpaceDraft"("updatedById");
CREATE INDEX "SmartObject_spaceId_idx" ON "SmartObject"("spaceId");
CREATE INDEX "SmartObject_type_idx" ON "SmartObject"("type");

ALTER TABLE "SpaceSettings" ADD CONSTRAINT "SpaceSettings_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeskAssignment" ADD CONSTRAINT "DeskAssignment_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeskAssignment" ADD CONSTRAINT "DeskAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpaceDraft" ADD CONSTRAINT "SpaceDraft_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceDraft" ADD CONSTRAINT "SpaceDraft_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SmartObject" ADD CONSTRAINT "SmartObject_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
