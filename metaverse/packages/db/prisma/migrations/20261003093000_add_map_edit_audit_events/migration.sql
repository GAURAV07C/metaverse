CREATE TABLE "MapEditAuditEvent" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorUsername" TEXT,
    "summary" JSONB,
    "versionId" TEXT,
    "versionNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapEditAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MapEditAuditEvent_spaceId_createdAt_idx" ON "MapEditAuditEvent"("spaceId", "createdAt");
CREATE INDEX "MapEditAuditEvent_actorUserId_idx" ON "MapEditAuditEvent"("actorUserId");
CREATE INDEX "MapEditAuditEvent_versionId_idx" ON "MapEditAuditEvent"("versionId");

ALTER TABLE "MapEditAuditEvent" ADD CONSTRAINT "MapEditAuditEvent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
