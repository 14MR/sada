import { Request, Response } from "express";
import { CreatorService } from "../services/creator.service";

export class CreatorController {
    /** GET /creator/dashboard — requires auth */
    static async dashboard(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const stats = await CreatorService.getDashboard(userId);
            return res.json(stats);
        } catch (error: any) {
            if (error.message === "User not found") return res.status(404).json({ error: error.message });
            console.error("Creator Dashboard Error:", error);
            return res.status(500).json({ error: "Failed to load dashboard" });
        }
    }

    /** GET /creator/earnings — gem earnings breakdown */
    static async earnings(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { from, to } = req.query;
            const earnings = await CreatorService.getEarnings(
                userId,
                from ? new Date(from as string) : undefined,
                to ? new Date(to as string) : undefined
            );
            return res.json(earnings);
        } catch (error) {
            console.error("Creator Earnings Error:", error);
            return res.status(500).json({ error: "Failed to load earnings" });
        }
    }

    /** GET /creator/rooms — rooms hosted with stats */
    static async rooms(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;
            const rooms = await CreatorService.getHostedRooms(userId, limit, offset);
            return res.json(rooms);
        } catch (error) {
            console.error("Creator Rooms Error:", error);
            return res.status(500).json({ error: "Failed to load rooms" });
        }
    }

    /** GET /creator/top-supporters — users who gifted the most */
    static async topSupporters(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const limit = parseInt(req.query.limit as string) || 10;
            const supporters = await CreatorService.getTopSupporters(userId, limit);
            return res.json(supporters);
        } catch (error) {
            console.error("Top Supporters Error:", error);
            return res.status(500).json({ error: "Failed to load supporters" });
        }
    }
}
