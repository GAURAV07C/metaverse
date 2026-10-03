ALTER TABLE "SpaceSettings" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'Public';
ALTER TABLE "SpaceSettings" ADD COLUMN "joinPolicy" TEXT NOT NULL DEFAULT 'InviteLink';
