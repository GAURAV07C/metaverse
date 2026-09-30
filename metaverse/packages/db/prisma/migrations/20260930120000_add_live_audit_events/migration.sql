CREATE TABLE "RoomInviteEvent" (
  "id" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "inviteId" TEXT,
  "direction" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "fromUserId" TEXT,
  "fromUsername" TEXT,
  "toUserId" TEXT,
  "toUsername" TEXT,
  "roomId" TEXT NOT NULL,
  "roomName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoomInviteEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModerationAuditEvent" (
  "id" TEXT NOT NULL,
  "spaceId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorUsername" TEXT,
  "targetUserId" TEXT,
  "targetUsername" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoomInviteEvent_spaceId_createdAt_idx" ON "RoomInviteEvent"("spaceId", "createdAt");
CREATE INDEX "RoomInviteEvent_inviteId_idx" ON "RoomInviteEvent"("inviteId");
CREATE INDEX "RoomInviteEvent_fromUserId_idx" ON "RoomInviteEvent"("fromUserId");
CREATE INDEX "RoomInviteEvent_toUserId_idx" ON "RoomInviteEvent"("toUserId");
CREATE INDEX "ModerationAuditEvent_spaceId_createdAt_idx" ON "ModerationAuditEvent"("spaceId", "createdAt");
CREATE INDEX "ModerationAuditEvent_actorUserId_idx" ON "ModerationAuditEvent"("actorUserId");
CREATE INDEX "ModerationAuditEvent_targetUserId_idx" ON "ModerationAuditEvent"("targetUserId");

ALTER TABLE "RoomInviteEvent" ADD CONSTRAINT "RoomInviteEvent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAuditEvent" ADD CONSTRAINT "ModerationAuditEvent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
