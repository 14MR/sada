import { AppDataSource } from "../config/database";
import { Report, ReportReason, ReportStatus } from "../models/Report";
import { UserBlock } from "../models/UserBlock";

const reportRepository = AppDataSource.getRepository(Report);
const blockRepository = AppDataSource.getRepository(UserBlock);

export class ModerationService {
    // === Reports ===

    static async createReport(
        reporterId: string,
        reportedUserId: string,
        reason: ReportReason,
        description?: string,
        roomId?: string
    ) {
        if (reporterId === reportedUserId) throw new Error("Cannot report yourself");

        const report = reportRepository.create({
            reporter_id: reporterId,
            reported_user_id: reportedUserId,
            reason,
            description: description || null,
            room_id: roomId || null,
            status: ReportStatus.PENDING,
        });

        return await reportRepository.save(report);
    }

    // === Blocks ===

    static async blockUser(blockerId: string, blockedId: string) {
        if (blockerId === blockedId) throw new Error("Cannot block yourself");

        const existing = await blockRepository.findOne({
            where: { blocker_id: blockerId, blocked_id: blockedId },
        });
        if (existing) throw new Error("Already blocked");

        const block = blockRepository.create({ blocker_id: blockerId, blocked_id: blockedId });
        return await blockRepository.save(block);
    }

    static async unblockUser(blockerId: string, blockedId: string) {
        const block = await blockRepository.findOne({
            where: { blocker_id: blockerId, blocked_id: blockedId },
        });
        if (!block) throw new Error("Block not found");
        await blockRepository.remove(block);
    }

    static async getBlockedUsers(userId: string) {
        const blocks = await blockRepository.find({
            where: { blocker_id: userId },
            relations: ["blocked"],
        });
        return blocks.map((b) => b.blocked);
    }
}
