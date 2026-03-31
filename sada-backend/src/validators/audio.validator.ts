import { z } from "zod";

export const createSessionSchema = z.object({
    roomId: z.string().min(1, "Room ID is required"),
});

export const joinSessionSchema = z.object({
    offerSdp: z.string().min(1, "Offer SDP is required"),
    role: z.enum(["host", "speaker", "listener"]).optional().default("listener"),
});

export const leaveSessionSchema = z.object({});

export const renegotiateSchema = z.object({
    offerSdp: z.string().min(1, "Offer SDP is required"),
});

export const muteSchema = z.object({
    muted: z.boolean(),
});
