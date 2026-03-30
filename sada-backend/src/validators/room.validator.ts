import { z } from "zod";

export const createRoomSchema = z.object({
    userId: z.string().min(1),
    title: z.string().min(1).max(200),
    categoryId: z.string().optional(),
    description: z.string().max(1000).optional(),
    scheduledAt: z.string().optional(),
});

export const joinRoomSchema = z.object({
    userId: z.string().min(1),
});
export const leaveRoomSchema = z.object({
    userId: z.string().min(1),
});
export const manageSpeakerSchema = z.object({
    userId: z.string().min(1),
    targetUserId: z.string().min(1),
    role: z.enum(["speaker", "listener"]),
});
export const endRoomSchema = z.object({
    userId: z.string().min(1),
});
export const searchRoomSchema = z.object({
    q: z.string({ message: "Search query required" }).min(1, "Search query required"),
});

