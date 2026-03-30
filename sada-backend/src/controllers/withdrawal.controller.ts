import { Request, Response } from "express";
import { WithdrawalService } from "../services/withdrawal.service";
import { PayoutMethod } from "../models/Withdrawal";

export class WithdrawalController {
    static async request(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { amount, payout_method, payout_details } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: "Valid amount is required" });
            }

            const payoutMethod = payout_method || PayoutMethod.STRIPE;
            const withdrawal = await WithdrawalService.requestWithdrawal(
                userId,
                amount,
                payoutMethod,
                payout_details
            );
            return res.json(withdrawal);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const withdrawals = await WithdrawalService.getWithdrawals(userId, limit, offset);
            return res.json(withdrawals);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async pending(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const withdrawals = await WithdrawalService.getPendingWithdrawals(limit, offset);
            return res.json(withdrawals);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async process(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const { approve, note } = req.body;

            if (approve === undefined) {
                return res.status(400).json({ error: "approve field is required" });
            }

            const withdrawal = await WithdrawalService.processWithdrawal(
                id,
                (req as any).user?.id || "admin",
                approve,
                note
            );
            return res.json(withdrawal);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}
