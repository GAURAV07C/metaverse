CREATE INDEX IF NOT EXISTS "User_avatarId_idx" ON "User"("avatarId");
CREATE INDEX IF NOT EXISTS "User_orgId_idx" ON "User"("orgId");
CREATE INDEX IF NOT EXISTS "User_teamId_idx" ON "User"("teamId");

CREATE INDEX IF NOT EXISTS "Space_creatorId_idx" ON "Space"("creatorId");

CREATE INDEX IF NOT EXISTS "spaceElements_spaceId_idx" ON "spaceElements"("spaceId");
CREATE INDEX IF NOT EXISTS "spaceElements_elementId_idx" ON "spaceElements"("elementId");
CREATE INDEX IF NOT EXISTS "spaceElements_spaceId_x_y_idx" ON "spaceElements"("spaceId", "x", "y");

CREATE INDEX IF NOT EXISTS "Element_category_idx" ON "Element"("category");

CREATE INDEX IF NOT EXISTS "Map_name_idx" ON "Map"("name");

CREATE INDEX IF NOT EXISTS "MapElements_mapId_idx" ON "MapElements"("mapId");
CREATE INDEX IF NOT EXISTS "MapElements_elementId_idx" ON "MapElements"("elementId");

CREATE INDEX IF NOT EXISTS "Organization_name_idx" ON "Organization"("name");

CREATE INDEX IF NOT EXISTS "Team_orgId_idx" ON "Team"("orgId");

CREATE INDEX IF NOT EXISTS "PrivateZone_spaceId_idx" ON "PrivateZone"("spaceId");

CREATE INDEX IF NOT EXISTS "Meeting_spaceId_idx" ON "Meeting"("spaceId");
CREATE INDEX IF NOT EXISTS "Meeting_startTime_idx" ON "Meeting"("startTime");

CREATE INDEX IF NOT EXISTS "InteractiveObject_elementId_idx" ON "InteractiveObject"("elementId");
