import { AppDataSource } from "../config/database";
import { UserBlock } from "../models/UserBlock";

const blockRepository = AppDataSource.getRepository(UserBlock);

export class BlockService {
    /** Check if either user has blocked the other (bidirectional check) */
    static async isBlocked(userIdA: string, userIdB: string): Promise<boolean> {
        const block = await blockRepository.findOne({
            where: [
                { blocker_id: userIdA, blocked_id: userIdB },
                { blocker_id: userIdB, blocked_id: userIdA },
            ],
        });
        return !!block;
    }

    /** Block a user */
    static async blockUser(blockerId: string, blockedId: string) {
        if (blockerId === blockedId) throw new Error("Cannot block yourself");

        const existing = await blockRepository.findOne({
            where: { blocker_id: blockerId, blocked_id: blockedId },
        });
        if (existing) throw new Error("Already blocked");

        const block = blockRepository.create({ blocker_id: blockerId, blocked_id: blockedId });
        return await blockRepository.save(block);
    }

    /** Unblock a user */
    static async unblockUser(blockerId: string, blockedId: string) {
        const block = await blockRepository.findOne({
            where: { blocker_id: blockerId, blocked_id: blockedId },
        });
        if (!block) throw new Error("Block not found");
        await blockRepository.remove(block);
    }

    /** List blocked users */
    static async getBlockedUsers(userId: string) {
        const blocks = await blockRepository.find({
            where: { blocker_id: userId },
            relations: ["blocked"],
        });
        return blocks.map((b) => b.blocked);
    }
}
