import { Request, Response } from "express";
import { NotificationPreferenceService } from "../services/notification-preference.service";
import logger from "../config/logger";

export class NotificationPreferenceController {
    static async get(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const preferences = await NotificationPreferenceService.getForUser(userId);
            return res.json(preferences);
        } catch (error: any) {
            logger.error({ err: error }, "Get Notification Preferences Error");
            return res.status(500).json({ error: "Failed to get notification preferences" });
        }
    }

    static async bulkUpdate(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { preferences } = req.body;
            if (!Array.isArray(preferences) || preferences.length === 0) {
                return res.status(400).json({ error: "preferences array is required" });
            }

            const updated = await NotificationPreferenceService.bulkUpdate(userId, preferences);
            return res.json(updated);
        } catch (error: any) {
            logger.error({ err: error }, "Update Notification Preferences Error");
            return res.status(500).json({ error: "Failed to update notification preferences" });
        }
    }
}
