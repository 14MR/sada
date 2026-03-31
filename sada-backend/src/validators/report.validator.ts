import { z } from "zod";
import { ReportReason } from "../models/Report";

export const submitReportSchema = z.object({
    reportedUserId: z.string().optional(),
    roomId: z.string().optional(),
    reason: z.enum(
        [ReportReason.HARASSMENT, ReportReason.SPAM, ReportReason.HATE_SPEECH, ReportReason.VIOLENCE, ReportReason.NUDITY, ReportReason.OTHER],
        { message: `Invalid reason. Valid: ${Object.values(ReportReason).join(", ")}` },
    ),
    description: z.string().max(1000).optional(),
}).refine((data) => data.reportedUserId || data.roomId, {
    message: "Either reportedUserId or roomId is required",
});

export const updateReportStatusSchema = z.object({
    status: z.enum(["reviewed", "dismissed", "actioned"], {
        message: "Invalid status. Must be 'reviewed', 'dismissed', or 'actioned'",
    }),
});

export const listReportsSchema = z.object({
    status: z.string().optional(),
    type: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});
