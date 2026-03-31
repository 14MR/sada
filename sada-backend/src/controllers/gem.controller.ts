import { Request, Response } from "express";
import { GemService } from "../services/gem.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class GemController {
    static async purchase(req: AuthRequest, res: Response) {
        try {
            const { amount } = req.body;
            const user = req.user!;
            const tx = await GemService.purchaseGems(user.id, amount);
            return res.json(tx);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async gift(req: AuthRequest, res: Response) {
        try {
            const { receiverId, amount, roomId } = req.body;
            const user = req.user!;
            const tx = await GemService.sendGift(user.id, receiverId, amount, roomId);
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
