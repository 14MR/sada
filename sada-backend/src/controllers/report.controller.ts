import { Request, Response } from "express";
import { ReportService } from "../services/report.service";
import { ReportReason, ReportStatus } from "../models/Report";
import logger from "../config/logger";

export class ReportController {
    /** POST /reports — submit a report */
    static async submit(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { reportedUserId, roomId, reason, description } = req.body;
            if (!reason) return res.status(400).json({ error: "reason is required" });
            if (!Object.values(ReportReason).includes(reason)) {
                return res.status(400).json({ error: `Invalid reason. Valid: ${Object.values(ReportReason).join(", ")}` });
            }

            const report = await ReportService.submitReport(userId, {
                reportedUserId, roomId, reason, description,
            });
            return res.status(201).json(report);
        } catch (error: any) {
            if (error.message.includes("required") || error.message.includes("yourself")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Submit Report Error");
            return res.status(500).json({ error: "Failed to submit report" });
        }
    }

    /** GET /reports — admin-only, list reports with filtering */
    static async list(req: Request, res: Response) {
        try {
            const status = req.query.status as string | undefined;
            const type = req.query.type as string | undefined;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await ReportService.listReports({ status, type }, limit, offset);
            return res.json(result);
        } catch (error) {
            logger.error({ err: error }, "List Reports Error");
            return res.status(500).json({ error: "Failed to list reports" });
        }
    }

    /** PATCH /reports/:id — admin-only, update report status */
    static async updateStatus(req: Request, res: Response) {
        try {
            const reportId = req.params.id as string;
            const { status } = req.body;

            if (!status || !["reviewed", "dismissed", "actioned"].includes(status)) {
                return res.status(400).json({ error: "Invalid status. Must be 'reviewed', 'dismissed', or 'actioned'" });
            }

            const report = await ReportService.updateReportStatus(reportId, status as ReportStatus);
            return res.json(report);
        } catch (error: any) {
            if (error.message === "Report not found") {
                return res.status(404).json({ error: error.message });
            }
            logger.error({ err: error }, "Update Report Status Error");
            return res.status(500).json({ error: "Failed to update report status" });
        }
    }
}
