import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import logger from "../config/logger";

export class UserController {
    static async getProfile(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const user = await UserService.getProfile(id);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            return res.json(user);
        } catch (error) {
            logger.error({ err: error }, "Get Profile Error");
            return res.status(500).json({ error: "Failed to fetch profile" });
        }
    }

    static async updateProfile(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const currentUser = (req as any).user?.id;
            if (!currentUser) return res.status(401).json({ error: "Authentication required" });
            if (currentUser !== id) return res.status(403).json({ error: "Forbidden" });

            // Whitelist allowed fields to prevent mass assignment
            const allowedFields = ['display_name', 'bio', 'avatar_url', 'twitter_handle', 'instagram_handle', 'language', 'username'];
            const updates: Record<string, any> = {};
            for (const field of allowedFields) {
                if (req.body[field] !== undefined) {
                    updates[field] = req.body[field];
                }
            }

            const updatedUser = await UserService.updateProfile(id, updates);
            return res.status(200).json(updatedUser);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async deleteAccount(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const currentUser = (req as any).user?.id;
            if (!currentUser) return res.status(401).json({ error: "Authentication required" });
            if (currentUser !== id) return res.status(403).json({ error: "Forbidden" });
            await UserService.deleteUser(id);
            return res.status(200).json({ success: true, message: "Account deleted successfully" });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
