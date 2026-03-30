import { z } from "zod";

// userId is no longer required in request — it comes from the authenticated user.
export const listNotificationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});

export const markReadSchema = z.object({});

export const markAllReadSchema = z.object({});

export const unreadCountSchema = z.object({});

export const registerPushTokenSchema = z.object({
    token: z.string({ message: "Push token is required" }).min(1, "Push token is required"),
});
