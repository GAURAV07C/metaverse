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
    name: z.string(),
    dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
    mapId: z.string().optional(),
});
export const AddElementSchema = z.object({
    spaceId: z.string(),
    elementId: z.string(),
    x: z.number(),
    y: z.number(),
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
    imageUrl: z.string()
});
export const CreateAvatarSchema = z.object({
    name: z.string(),
    imageUrl: z.string()
});
export const CreateMapSchema = z.object({
    thumbnail: z.string(),
    name: z.string(),
    dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
    defaultElements: z.array(z.object({
        elementId: z.string(),
        x: z.number(),
        y: z.number(),
    }))
});
export const UpdateMapSchema = z.object({
    name: z.string().optional(),
    thumbnail: z.string().optional(),
});
export const UpdateSpaceSchema = z.object({
    name: z.string().optional(),
});
//# sourceMappingURL=index.js.map