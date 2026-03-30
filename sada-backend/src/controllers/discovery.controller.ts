import { Request, Response } from "express";
import { DiscoveryService } from "../services/discovery.service";

export class DiscoveryController {
    static async trending(_req: Request, res: Response) {
        try {
            const limit = parseInt(_req.query.limit as string) || 20;
            const rooms = await DiscoveryService.getTrending(limit);
            return res.json(rooms);
        } catch (error) {
            console.error("Trending Error:", error);
            return res.status(500).json({ error: "Failed to get trending rooms" });
        }
    }

    static async upcoming(_req: Request, res: Response) {
        try {
            const limit = parseInt(_req.query.limit as string) || 10;
            const rooms = await DiscoveryService.getUpcoming(limit);
            return res.json(rooms);
        } catch (error) {
            console.error("Upcoming Error:", error);
            return res.status(500).json({ error: "Failed to get upcoming rooms" });
        }
    }

    static async forYou(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const limit = parseInt(req.query.limit as string) || 20;
            const rooms = await DiscoveryService.getForYou(userId, limit);
            return res.json(rooms);
        } catch (error) {
            console.error("ForYou Error:", error);
            return res.status(500).json({ error: "Failed to get recommendations" });
        }
    }
}
