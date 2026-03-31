import { Request, Response } from "express";
import { ActivityService } from "../services/activity.service";

export class ActivityController {
    /** GET /users/activity — get recent activity for authenticated user */
    static async getActivity(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
            const offset = Math.max(Number(req.query.offset) || 0, 0);

            const result = await ActivityService.getUserActivity(userId, limit, offset);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ error: "Failed to fetch activity" });
        }
    }
}
