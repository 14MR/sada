import { Request, Response } from "express";
import { NotificationService } from "../services/notification.service";
import { PushService } from "../services/push.service";

export class NotificationController {
    static async list(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

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
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const notificationId = req.params.id as string;

            const updated = await NotificationService.markRead(userId, notificationId);
            if (!updated) return res.status(404).json({ error: "Notification not found" });

            return res.json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async markAllRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const count = await NotificationService.markAllRead(userId);
            return res.json({ success: true, count });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async unreadCount(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const count = await NotificationService.getUnreadCount(userId);
            return res.json({ count });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    /** POST /notifications/register-token — register Expo push token */
    static async registerPushToken(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { token } = req.body;
            if (!token) return res.status(400).json({ error: "Push token is required" });

            await PushService.registerToken(userId, token);
            return res.json({ success: true });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}
