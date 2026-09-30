CREATE TABLE "SpaceMapVersion" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceMapVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SpaceMapVersion_spaceId_version_key" ON "SpaceMapVersion"("spaceId", "version");
CREATE INDEX "SpaceMapVersion_spaceId_createdAt_idx" ON "SpaceMapVersion"("spaceId", "createdAt");
CREATE INDEX "SpaceMapVersion_createdById_idx" ON "SpaceMapVersion"("createdById");

ALTER TABLE "SpaceMapVersion" ADD CONSTRAINT "SpaceMapVersion_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpaceMapVersion" ADD CONSTRAINT "SpaceMapVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
