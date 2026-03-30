import { Request, Response } from "express";
import { ReactionService } from "../services/reaction.service";

export class ReactionController {
    static async addReaction(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { messageId, roomId, emoji } = req.body;

            if (!messageId || !roomId || !emoji) {
                return res.status(400).json({ error: "messageId, roomId, and emoji are required" });
            }

            if (emoji.length > 10) {
                return res.status(400).json({ error: "Emoji must be 10 characters or less" });
            }

            const reaction = await ReactionService.addReaction(userId, messageId, roomId, emoji);
            return res.json(reaction);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async removeReaction(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const messageId = req.query.messageId as string;
            const emoji = req.query.emoji as string;

            if (!messageId || !emoji) {
                return res.status(400).json({ error: "messageId and emoji are required" });
            }

            const removed = await ReactionService.removeReaction(userId, messageId, emoji);
            if (!removed) return res.status(404).json({ error: "Reaction not found" });

            return res.json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async getMessageReactions(req: Request, res: Response) {
        try {
            const messageId = req.params.messageId as string;
            const reactions = await ReactionService.getMessageReactions(messageId);
            return res.json(reactions);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
