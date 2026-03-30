import { z } from "zod";

export const listNotificationSchema = z.object({
    userId: z.string({ message: "userId is required" }).min(1),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

export const markReadSchema = z.object({
    userId: z.string({ message: "userId is required" }).min(1),
});

export const markAllReadSchema = z.object({
    userId: z.string({ message: "userId is required" }).min(1),
});

export const unreadCountSchema = z.object({
    userId: z.string({ message: "userId is required" }).min(1),
});

export const registerPushTokenSchema = z.object({
    token: z.string({ message: "Push token is required" }).min(1, "Push token is required"),
});
