import { z } from "zod";

// userId is no longer accepted from body — it comes from the authenticated user.
export const createRoomSchema = z.object({
    title: z.string().min(1).max(200),
    categoryId: z.string().optional(),
    description: z.string().max(1000).optional(),
    scheduledAt: z.string().optional(),
});

export const joinRoomSchema = z.object({});
export const leaveRoomSchema = z.object({});
export const manageSpeakerSchema = z.object({
    targetUserId: z.string().min(1),
    role: z.enum(["speaker", "listener"]),
});
export const endRoomSchema = z.object({});
export const searchRoomSchema = z.object({
    q: z.string({ message: "Search query required" }).min(1, "Search query required"),
});
