import { z } from "zod";

export const SignupSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  type: z.enum(["user", "admin"]),
});

export const SigninSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const UpdatedMetaVerseSchema = z.object({
  avatarId: z.string(),
});

export const UpdateMetaVerseSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  image: z.string().min(1),
});

export const CreateSpaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
  mapId: z.string().optional(),
});

export const AddElementSchema = z.object({
  spaceId: z.string().min(1),
  elementId: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const deleteElement = z.object({
  id: z.string(),

});

export const CreateElementSchema = z.object({
  imageUrl: z.string(),
  width: z.number(),
  height: z.number(),
  static: z.boolean(),
});

export const UpdateElementSchema = z.object({
    imageUrl:z.string()
})

export const CreateAvatarSchema = z.object({
    name:z.string(),
    imageUrl:z.string()
})

export const CreateMapSchema = z.object({
  thumbnail: z.string(),
  name:z.string(),
  dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
  defaultElements: z.array(z.object({
    elementId:z.string(),
    x:z.number(),
    y:z.number(),
  }))
});

export const UpdateMapSchema = z.object({
  name: z.string().optional(),
  thumbnail: z.string().optional(),
  defaultElements: z.array(z.object({
    elementId: z.string(),
    x: z.number(),
    y: z.number(),
  })).optional(),
});

export const UpdateSpaceSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/).optional(),
});


export const OfficeSettingsSchema = z.object({
  layoutType: z.string().max(40).optional(),
  theme: z.string().max(40).optional(),
  sizeRange: z.string().max(20).optional(),
  language: z.string().max(40).optional(),
  colorMode: z.string().max(20).optional(),
  ambientAudioVideo: z.boolean().optional(),
  conversationRange: z.string().max(20).optional(),
  autoLockDesks: z.boolean().optional(),
  announcementsEnabled: z.boolean().optional(),
  chatChannelsEnabled: z.boolean().optional(),
  meetingChatEnabled: z.boolean().optional(),
  nearbyChatEnabled: z.boolean().optional(),
  directMessagesEnabled: z.boolean().optional(),
  companyEmailMembership: z.boolean().optional(),
  supportAccess: z.boolean().optional(),
  memberInvitesEnabled: z.boolean().optional(),
  smartObjectsEnabled: z.boolean().optional(),
});

export const DeskAssignmentSchema = z.object({
  userId: z.string().optional().nullable(),
  label: z.string().trim().min(1).max(80),
  teamName: z.string().trim().min(1).max(80).default("Team"),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export const SpaceDraftSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});
