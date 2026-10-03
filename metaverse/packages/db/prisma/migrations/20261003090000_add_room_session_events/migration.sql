CREATE TABLE "RoomSessionEvent" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "roomId" TEXT,
    "roomName" TEXT,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "previousRoomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomSessionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoomSessionEvent_spaceId_createdAt_idx" ON "RoomSessionEvent"("spaceId", "createdAt");
CREATE INDEX "RoomSessionEvent_spaceId_roomId_createdAt_idx" ON "RoomSessionEvent"("spaceId", "roomId", "createdAt");
CREATE INDEX "RoomSessionEvent_userId_idx" ON "RoomSessionEvent"("userId");

ALTER TABLE "RoomSessionEvent" ADD CONSTRAINT "RoomSessionEvent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
