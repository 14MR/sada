import { Request, Response } from "express";
import { ModerationService } from "../services/moderation.service";
import { ReportReason } from "../models/Report";

export class ModerationController {
    /** POST /moderation/report — report a user */
    static async report(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { reportedUserId, reason, description, roomId } = req.body;
            if (!reportedUserId || !reason) {
                return res.status(400).json({ error: "reportedUserId and reason required" });
            }
            if (!Object.values(ReportReason).includes(reason)) {
                return res.status(400).json({ error: `Invalid reason. Valid: ${Object.values(ReportReason).join(", ")}` });
            }

            const report = await ModerationService.createReport(
                userId, reportedUserId, reason, description, roomId
            );
            return res.status(201).json({ id: report.id, status: "submitted" });
        } catch (error: any) {
            if (error.message === "Cannot report yourself") return res.status(400).json({ error: error.message });
            return res.status(500).json({ error: "Failed to submit report" });
        }
    }

    /** POST /moderation/block — block a user */
    static async block(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { blockedId } = req.body as { blockedId: string };
            if (!blockedId) return res.status(400).json({ error: "blockedId required" });

            await ModerationService.blockUser(userId, blockedId);
            return res.json({ success: true });
        } catch (error: any) {
            if (error.message.includes("Cannot block") || error.message.includes("Already")) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Failed to block user" });
        }
    }

    /** POST /moderation/unblock — unblock a user */
    static async unblock(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { blockedId } = req.body as { blockedId: string };
            if (!blockedId) return res.status(400).json({ error: "blockedId required" });

            await ModerationService.unblockUser(userId, blockedId);
            return res.json({ success: true });
        } catch (error: any) {
            if (error.message === "Block not found") return res.status(404).json({ error: error.message });
            return res.status(500).json({ error: "Failed to unblock user" });
        }
    }

    /** GET /moderation/blocked — list blocked users */
    static async listBlocked(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const blocked = await ModerationService.getBlockedUsers(userId);
            return res.json(blocked);
        } catch (error) {
            return res.status(500).json({ error: "Failed to list blocked users" });
        }
    }
}
