import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";
import logger from "../config/logger";

export class AdminController {
    static async getStats(req: Request, res: Response) {
        try {
            const stats = await AdminService.getStats();
            return res.json(stats);
        } catch (error) {
            logger.error({ err: error }, "Admin Stats Error");
            return res.status(500).json({ error: "Failed to fetch stats" });
        }
    }

    static async getUsers(req: Request, res: Response) {
        try {
            const result = await AdminService.getUsers({
                limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
                offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
                search: req.query.search as string | undefined,
                sort: req.query.sort as string | undefined,
                order: req.query.order as "ASC" | "DESC" | undefined,
                banned: req.query.banned !== undefined ? req.query.banned === "true" : undefined,
                flagged: req.query.flagged !== undefined ? req.query.flagged === "true" : undefined,
                is_creator: req.query.is_creator !== undefined ? req.query.is_creator === "true" : undefined,
            });
            return res.json(result);
        } catch (error) {
            logger.error({ err: error }, "Admin Users Error");
            return res.status(500).json({ error: "Failed to fetch users" });
        }
    }

    static async getReports(req: Request, res: Response) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
            const result = await AdminService.getReports(limit, offset);
            return res.json(result);
        } catch (error) {
            logger.error({ err: error }, "Admin Reports Error");
            return res.status(500).json({ error: "Failed to fetch reports" });
        }
    }

    static async banUser(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const adminKey = req.headers["x-admin-key"] as string;
            const user = await AdminService.banUser(id, adminKey);
            return res.json({ id: user.id, username: user.username, banned: user.banned });
        } catch (error: any) {
            if (error.message === "User not found") {
                return res.status(404).json({ error: error.message });
            }
            logger.error({ err: error }, "Ban User Error");
            return res.status(500).json({ error: "Failed to ban user" });
        }
    }

    static async unbanUser(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const adminKey = req.headers["x-admin-key"] as string;
            const user = await AdminService.unbanUser(id, adminKey);
            return res.json({ id: user.id, username: user.username, banned: user.banned });
        } catch (error: any) {
            if (error.message === "User not found") {
                return res.status(404).json({ error: error.message });
            }
            logger.error({ err: error }, "Unban User Error");
            return res.status(500).json({ error: "Failed to unban user" });
        }
    }

    static async patchUser(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const adminKey = req.headers["x-admin-key"] as string;
            const user = await AdminService.patchUser(id, req.body, adminKey);
            return res.json({
                id: user.id,
                username: user.username,
                banned: user.banned,
                verified: user.verified,
                is_creator: user.is_creator,
            });
        } catch (error: any) {
            if (error.message === "User not found") {
                return res.status(404).json({ error: error.message });
            }
            logger.error({ err: error }, "Patch User Error");
            return res.status(500).json({ error: "Failed to update user" });
        }
    }

    static async reviewReport(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const { action } = req.body;

            if (!action || !["reviewed", "dismissed"].includes(action)) {
                return res.status(400).json({ error: "Invalid action. Must be 'reviewed' or 'dismissed'" });
            }

            const adminKey = req.headers["x-admin-key"] as string;
            const report = await AdminService.reviewReport(id, action, adminKey);
            return res.json(report);
        } catch (error: any) {
            if (error.message === "Report not found") {
                return res.status(404).json({ error: error.message });
            }
            logger.error({ err: error }, "Review Report Error");
            return res.status(500).json({ error: "Failed to review report" });
        }
    }
}
