import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";

export class AdminController {
    static async getStats(req: Request, res: Response) {
        try {
            const stats = await AdminService.getStats();
            return res.json(stats);
        } catch (error) {
            console.error("Admin Stats Error:", error);
            return res.status(500).json({ error: "Failed to fetch stats" });
        }
    }

    static async getReports(req: Request, res: Response) {
        try {
            const { status, limit, offset } = req.query;
            const result = await AdminService.getReports(
                status as string,
                limit ? parseInt(limit as string) : 20,
                offset ? parseInt(offset as string) : 0
            );
            return res.json(result);
        } catch (error) {
            console.error("Admin Reports Error:", error);
            return res.status(500).json({ error: "Failed to fetch reports" });
        }
    }

    static async reviewReport(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const { status, action } = req.body;

            if (!status || !["actioned", "dismissed"].includes(status)) {
                return res.status(400).json({ error: "Invalid status. Must be 'actioned' or 'dismissed'" });
            }
            if (!action || !["warn", "ban", "none"].includes(action)) {
                return res.status(400).json({ error: "Invalid action. Must be 'warn', 'ban', or 'none'" });
            }

            const adminKey = req.headers["x-admin-key"] as string;
            const report = await AdminService.reviewReport(id, status, action, adminKey);
            return res.json(report);
        } catch (error: any) {
            if (error.message === "Report not found") {
                return res.status(404).json({ error: error.message });
            }
            console.error("Review Report Error:", error);
            return res.status(500).json({ error: "Failed to review report" });
        }
    }

    static async getUsers(req: Request, res: Response) {
        try {
            const { q, limit, offset } = req.query;
            const result = await AdminService.searchUsers(
                q as string,
                limit ? parseInt(limit as string) : 20,
                offset ? parseInt(offset as string) : 0
            );
            return res.json(result);
        } catch (error) {
            console.error("Admin Users Error:", error);
            return res.status(500).json({ error: "Failed to fetch users" });
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
            console.error("Ban User Error:", error);
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
            console.error("Unban User Error:", error);
            return res.status(500).json({ error: "Failed to unban user" });
        }
    }
}
