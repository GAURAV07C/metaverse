import { z } from "zod";
export declare const SignupSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    type: z.ZodEnum<{
        user: "user";
        admin: "admin";
    }>;
}, z.core.$strip>;
export declare const SigninSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const UpdatedMetaVerseSchema: z.ZodObject<{
    avatarId: z.ZodString;
}, z.core.$strip>;
export declare const UpdateMetaVerseSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    image: z.ZodString;
}, z.core.$strip>;
export declare const CreateSpaceSchema: z.ZodObject<{
    name: z.ZodString;
    dimensions: z.ZodString;
    mapId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const AddElementSchema: z.ZodObject<{
    spaceId: z.ZodString;
    elementId: z.ZodString;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, z.core.$strip>;
export declare const deleteElement: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const CreateElementSchema: z.ZodObject<{
    imageUrl: z.ZodString;
    width: z.ZodNumber;
    height: z.ZodNumber;
    static: z.ZodBoolean;
}, z.core.$strip>;
export declare const UpdateElementSchema: z.ZodObject<{
    imageUrl: z.ZodString;
}, z.core.$strip>;
export declare const CreateAvatarSchema: z.ZodObject<{
    name: z.ZodString;
    imageUrl: z.ZodString;
}, z.core.$strip>;
export declare const CreateMapSchema: z.ZodObject<{
    thumbnail: z.ZodString;
    name: z.ZodString;
    dimensions: z.ZodString;
    defaultElements: z.ZodArray<z.ZodObject<{
        elementId: z.ZodString;
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
//# sourceMappingURL=index.d.ts.map