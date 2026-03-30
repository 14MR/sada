import { Response } from "express";
import { GemService } from "../services/gem.service";
import { AuthenticatedRequest } from "../middleware/auth";

export class GemController {
    static async purchase(req: AuthenticatedRequest, res: Response) {
        try {
            const { amount } = req.body;
            const userId = req.user!.id;
            const tx = await GemService.purchaseGems(userId, amount);
            return res.json(tx);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async gift(req: AuthenticatedRequest, res: Response) {
        try {
            const { receiverId, amount, roomId } = req.body;
            const userId = req.user!.id;
            const tx = await GemService.sendGift(userId, receiverId, amount, roomId);
            return res.json(tx);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async getBalance(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.params.userId as string;
            const balance = await GemService.getBalance(userId);
            return res.json(balance);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async getHistory(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.params.userId as string;
            const history = await GemService.getHistory(userId);
            return res.json(history);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
