import { Request, Response } from "express";
import { BlockService } from "../services/block.service";

export class BlockController {
    /** POST /users/block — block a user */
    static async block(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { blockedId } = req.body as { blockedId: string };
            if (!blockedId) return res.status(400).json({ error: "blockedId required" });

            await BlockService.blockUser(userId, blockedId);
            return res.json({ success: true });
        } catch (error: any) {
            if (error.message.includes("Cannot block") || error.message.includes("Already")) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Failed to block user" });
        }
    }

    /** DELETE /users/block/:userId — unblock a user */
    static async unblock(req: Request, res: Response) {
        try {
            const blockerId = (req as any).user?.id;
            if (!blockerId) return res.status(401).json({ error: "Authentication required" });

            const blockedId = req.params.userId as string;
            if (!blockedId) return res.status(400).json({ error: "userId required" });

            await BlockService.unblockUser(blockerId, blockedId);
            return res.json({ success: true });
        } catch (error: any) {
            if (error.message === "Block not found") return res.status(404).json({ error: error.message });
            return res.status(500).json({ error: "Failed to unblock user" });
        }
    }

    /** GET /users/blocked — list blocked users */
    static async listBlocked(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const blocked = await BlockService.getBlockedUsers(userId);
            return res.json(blocked);
        } catch (error) {
            return res.status(500).json({ error: "Failed to list blocked users" });
        }
    }
}
