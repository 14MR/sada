import { z } from "zod";
import { ReportReason } from "../models/Report";

export const reportSchema = z.object({
    reportedUserId: z.string({ message: "reportedUserId is required" }).min(1),
    reason: z.enum(
        [ReportReason.HARASSMENT, ReportReason.SPAM, ReportReason.HATE_SPEECH, ReportReason.VIOLENCE, ReportReason.NUDITY, ReportReason.OTHER],
        { message: `Invalid reason. Valid: ${Object.values(ReportReason).join(", ")}` },
    ),
    description: z.string().max(1000).optional(),
    roomId: z.string().optional(),
});

export const blockSchema = z.object({
    blockedId: z.string({ message: "blockedId is required" }).min(1),
});

export const unblockSchema = z.object({
    blockedId: z.string({ message: "blockedId is required" }).min(1),
});
