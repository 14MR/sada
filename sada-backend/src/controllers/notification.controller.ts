import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";

export class NotificationController {
    static async list(req: Request, res: Response) {
        try {
            const userId = req.query.userId as string;
            if (!userId) return res.status(401).json({ error: "Unauthorized" });

            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const notifications = await NotificationService.getForUser(userId, limit, offset);
            return res.json(notifications);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async markRead(req: Request, res: Response) {
        try {
            const { userId } = req.body;
            const notificationId = req.params.id as string;

            if (!userId) return res.status(401).json({ error: "Unauthorized" });

            const updated = await NotificationService.markRead(userId, notificationId);
            if (!updated) return res.status(404).json({ error: "Notification not found" });

            return res.json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async markAllRead(req: Request, res: Response) {
        try {
            const { userId } = req.body;
            if (!userId) return res.status(401).json({ error: "Unauthorized" });

            const count = await NotificationService.markAllRead(userId);
            return res.json({ success: true, count });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async unreadCount(req: Request, res: Response) {
        try {
            const userId = req.query.userId as string;
            if (!userId) return res.status(401).json({ error: "Unauthorized" });

            const count = await NotificationService.getUnreadCount(userId);
            return res.json({ count });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
