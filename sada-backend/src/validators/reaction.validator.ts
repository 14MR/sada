import { z } from "zod";

export const addReactionSchema = z.object({
    messageId: z.string({ message: "messageId is required" }).min(1),
    roomId: z.string({ message: "roomId is required" }).min(1),
    emoji: z.string({ message: "emoji is required" }).min(1).max(10, "Emoji must be 10 characters or less"),
});

export const removeReactionSchema = z.object({
    messageId: z.string({ message: "messageId is required" }).min(1),
    emoji: z.string({ message: "emoji is required" }).min(1),
});
