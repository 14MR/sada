import { z } from "zod";

export const startRecordingSchema = z.object({
    roomId: z.string({ message: "roomId is required" }).min(1),
});

export const stopRecordingSchema = z.object({
    roomId: z.string({ message: "roomId is required" }).min(1),
});

export const listRecordingSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});
