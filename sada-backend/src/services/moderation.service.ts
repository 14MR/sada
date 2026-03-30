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

    static async getReports(status?: ReportStatus, limit: number = 20, offset: number = 0) {
        const where = status ? { status } : {};
        const [reports, total] = await reportRepository.findAndCount({
            where,
            relations: ["reporter", "reported_user"],
            order: { created_at: "DESC" },
            take: limit,
            skip: offset,
        });
        return { reports, total, hasMore: offset + limit < total };
    }

    static async reviewReport(reportId: string, adminId: string, status: ReportStatus) {
        const report = await reportRepository.findOneBy({ id: reportId });
        if (!report) throw new Error("Report not found");
        if (report.status !== ReportStatus.PENDING) throw new Error("Report already reviewed");

        report.status = status;
        report.reviewed_at = new Date();
        report.reviewed_by = adminId;

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

    static async isBlocked(userId1: string, userId2: string) {
        const block = await blockRepository.findOne({
            where: [
                { blocker_id: userId1, blocked_id: userId2 },
                { blocker_id: userId2, blocked_id: userId1 },
            ],
        });
        return !!block;
    }
}
