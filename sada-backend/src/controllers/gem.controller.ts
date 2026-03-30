import { Request, Response } from "express";
import { GemService } from "../services/gem.service";

export class GemController {
    static async purchase(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { amount, receiptData, platform } = req.body;
            const tx = await GemService.purchaseGems(userId, amount, receiptData, platform);
            return res.json(tx);
        } catch (error: any) {
            const status = error.message.includes("Duplicate") ? 409 : 400;
            return res.status(status).json({ error: error.message });
        }
    }

    static async gift(req: Request, res: Response) {
        try {
            const senderId = (req as any).user?.id;
            if (!senderId) return res.status(401).json({ error: "Authentication required" });

            const { receiverId, amount, roomId } = req.body;
            const tx = await GemService.sendGift(senderId, receiverId, amount, roomId);
            return res.json(tx);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async getBalance(req: Request, res: Response) {
        try {
            const userId = req.params.userId as string;
            const balance = await GemService.getBalance(userId);
            return res.json(balance);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async getHistory(req: Request, res: Response) {
        try {
            const userId = req.params.userId as string;
            const history = await GemService.getHistory(userId);
            return res.json(history);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
