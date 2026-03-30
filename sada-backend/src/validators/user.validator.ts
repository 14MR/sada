import { z } from "zod";

export const updateProfileSchema = z.object({
    display_name: z.string().min(1).max(100).optional(),
    bio: z.string().max(300).optional().nullable(),
    avatar_url: z.string().url().optional().nullable(),
    language: z.string().max(10).optional(),
    twitter_handle: z.string().max(100).optional().nullable(),
    instagram_handle: z.string().max(100).optional().nullable(),
}).strict();
