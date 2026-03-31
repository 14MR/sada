import { z } from "zod";

export const createConversationSchema = z.object({
    type: z.enum(["direct", "group"]),
    userId: z.string().min(1).optional(),
    userIds: z.array(z.string().min(1)).max(49, "Group can have at most 50 participants including you").optional(),
    name: z.string().min(1).max(100).optional(),
}).refine((data) => {
    if (data.type === "direct" && !data.userId) return false;
    if (data.type === "group" && (!data.userIds || data.userIds.length === 0)) return false;
    if (data.type === "group" && !data.name) return false;
    return true;
}, { message: "Missing required fields for the specified conversation type" });

export const listConversationsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

export const getConversationSchema = z.object({
    messageLimit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const sendMessageSchema = z.object({
    content: z.string().min(1, "Message content is required").max(1000, "Message content must be at most 1000 characters"),
    type: z.enum(["text", "image", "gift"]).optional().default("text"),
    metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const getMessagesSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    before: z.string().optional(),
    after: z.string().optional(),
});

export const editMessageSchema = z.object({
    content: z.string().min(1, "Message content is required").max(1000, "Message content must be at most 1000 characters"),
});

export const updateConversationSchema = z.object({
    name: z.string().min(1).max(100).optional(),
});

export const addParticipantSchema = z.object({
    userId: z.string().min(1),
});

export const markReadSchema = z.object({});
