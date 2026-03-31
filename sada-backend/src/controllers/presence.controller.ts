import { Request, Response } from "express";
import { PresenceService } from "../services/presence.service";
import logger from "../config/logger";

export class PresenceController {
    static async update(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { status, currentRoomId } = req.body;
            const presence = await PresenceService.updatePresence(userId, status, currentRoomId);
            return res.json(presence);
        } catch (error) {
            logger.error({ err: error }, "Update Presence Error");
            return res.status(500).json({ error: "Failed to update presence" });
        }
    }

    static async get(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const targetUserId = req.params.id as string;
            const presence = await PresenceService.getPresence(targetUserId);
            return res.json(presence);
        } catch (error) {
            logger.error({ err: error }, "Get Presence Error");
            return res.status(500).json({ error: "Failed to get presence" });
        }
    }
}
