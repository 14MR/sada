import { AppDataSource } from "../config/database";
import { Report, ReportReason, ReportStatus } from "../models/Report";
import { UserBlock } from "../models/UserBlock";

const reportRepository = AppDataSource.getRepository(Report);
const blockRepository = AppDataSource.getRepository(UserBlock);

export class CannotBlockSelfError extends Error {
    constructor() {
        super("Cannot block yourself");
        this.name = "CannotBlockSelfError";
    }
}

export class AlreadyBlockedError extends Error {
    constructor() {
        super("Already blocked");
        this.name = "AlreadyBlockedError";
    }
}

export class BlockNotFoundError extends Error {
    constructor() {
        super("Block not found");
        this.name = "BlockNotFoundError";
    }
}

export class InvalidReportTargetError extends Error {
    constructor() {
        super("Either reportedUserId or roomId is required");
        this.name = "InvalidReportTargetError";
    }
}

export class CannotReportSelfError extends Error {
    constructor() {
        super("Cannot report yourself");
        this.name = "CannotReportSelfError";
    }
}

export class ModerationService {
    // === Reports ===

    static async createReport(
        reporterId: string,
        reportedUserId: string | null | undefined,
        reason: ReportReason,
        description?: string,
        roomId?: string
    ) {
        const targetUserId = reportedUserId || null;
        if (targetUserId && reporterId === targetUserId) throw new CannotReportSelfError();

        const report = reportRepository.create({
            reporter_id: reporterId,
            reported_user_id: targetUserId,
            reason,
            description: description || null,
            room_id: roomId || null,
            status: ReportStatus.PENDING,
        });

        return await reportRepository.save(report);
    }

    // === Blocks ===

    static async blockUser(blockerId: string, blockedId: string) {
        if (blockerId === blockedId) throw new CannotBlockSelfError();

        const existing = await blockRepository.findOne({
            where: { blocker_id: blockerId, blocked_id: blockedId },
        });
        if (existing) throw new AlreadyBlockedError();

        const block = blockRepository.create({ blocker_id: blockerId, blocked_id: blockedId });
        return await blockRepository.save(block);
    }

    static async unblockUser(blockerId: string, blockedId: string) {
        const block = await blockRepository.findOne({
            where: { blocker_id: blockerId, blocked_id: blockedId },
        });
        if (!block) throw new BlockNotFoundError();
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
