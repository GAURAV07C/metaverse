ALTER TABLE "InviteLink" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'space';
ALTER TABLE "InviteLink" ADD COLUMN "roomId" TEXT;
ALTER TABLE "InviteLink" ADD COLUMN "createdById" TEXT;

CREATE INDEX "InviteLink_spaceId_scope_idx" ON "InviteLink"("spaceId", "scope");
CREATE INDEX "InviteLink_createdById_idx" ON "InviteLink"("createdById");
