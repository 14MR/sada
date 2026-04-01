import { z } from "zod";

// userId is no longer accepted from body — it comes from the authenticated user.
export const createRoomSchema = z.object({
    title: z.string().min(1).max(200),
    categoryId: z.string().optional(),
    description: z.string().max(1000).optional(),
    scheduledAt: z.string().optional(),
    tags: z.array(z.string().regex(/^[a-zA-Z0-9]+$/, "Tags must be alphanumeric")).max(5, "Maximum 5 tags allowed").optional().default([]),
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

// Scheduled rooms
export const scheduleRoomSchema = z.object({
    title: z.string().min(1).max(100, "Title must be at most 100 characters"),
    description: z.string().min(1).max(1000, "Description must be at most 1000 characters"),
    categoryId: z.string().min(1, "Category is required"),
    scheduledAt: z.string().min(1, "Scheduled time is required").refine((val) => {
        return new Date(val).getTime() > Date.now();
    }, "scheduledAt must be a future date"),
});

export const listScheduledSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    category: z.string().optional(),
});

export const startRoomSchema = z.object({});

// Trending / discovery
export const trendingSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

export const categoryRoomsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

export const listRoomsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
    category: z.string().optional(),
    status: z.enum(["live", "ended", "scheduled"]).optional().default("live"),
});

// Room invites
export const createInviteSchema = z.object({
    type: z.enum(["direct", "link"]),
    inviteeId: z.string().optional(),
    maxUses: z.number().int().min(1).optional(),
    expiresAt: z.string().optional(),
}).refine((data) => {
    if (data.type === "direct" && !data.inviteeId) return false;
    return true;
}, { message: "inviteeId is required for direct invites" });

export const acceptInviteSchema = z.object({});

export const listInvitesSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

// Room recommendations
export const recommendedSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

// Room clips
export const createClipSchema = z.object({
    startTime: z.number().int().min(0, "Start time must be non-negative"),
    endTime: z.number().int().min(1, "End time must be positive"),
    title: z.string().min(1).max(200, "Title must be at most 200 characters"),
}).refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
});

export const listClipsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

export const searchByTagSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});
