import { AppDataSource } from "../config/database";
import { UserBlock } from "../models/UserBlock";
import { ModerationService } from "./moderation.service";

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

    /** Block a user — delegates to ModerationService */
    static async blockUser(blockerId: string, blockedId: string) {
        return await ModerationService.blockUser(blockerId, blockedId);
    }

    /** Unblock a user — delegates to ModerationService */
    static async unblockUser(blockerId: string, blockedId: string) {
        return await ModerationService.unblockUser(blockerId, blockedId);
    }

    /** List blocked users — delegates to ModerationService */
    static async getBlockedUsers(userId: string) {
        return await ModerationService.getBlockedUsers(userId);
    }
}
