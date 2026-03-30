import { Request, Response } from "express";
import { ProfileService } from "../services/profile.service";
import logger from "../config/logger";

export class ProfileController {
    static async getProfile(req: Request, res: Response) {
        try {
            const userId = req.params.id as string;
            // In a real app, requesterId would come from auth middleware: req.user?.id
            const requesterId = (req as any).user?.id as string | undefined;

            const profile = await ProfileService.getPublicProfile(userId, requesterId);
            if (!profile) {
                return res.status(404).json({ error: "User not found" });
            }
            return res.json(profile);
        } catch (error) {
            logger.error({ err: error }, "Get Public Profile Error");
            return res.status(500).json({ error: "Failed to fetch profile" });
        }
    }

    static async updateProfile(req: Request, res: Response) {
        try {
            // In a real app, userId would come from auth middleware: req.user.id
            const userId = (req as any).user?.id as string;
            if (!userId) {
                return res.status(401).json({ error: "Authentication required" });
            }

            const updatedUser = await ProfileService.updateProfile(userId, req.body);
            return res.status(200).json(updatedUser);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async suggestedUsers(req: Request, res: Response) {
        try {
            const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
            const users = await ProfileService.getSuggestedUsers(limit);
            return res.json(users);
        } catch (error) {
            logger.error({ err: error }, "Get Suggested Users Error");
            return res.status(500).json({ error: "Failed to fetch suggested users" });
        }
    }
}
