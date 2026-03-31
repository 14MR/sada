import { AppDataSource } from "../config/database";
import { Report, ReportReason, ReportStatus } from "../models/Report";
import { User } from "../models/User";
import { ModerationService } from "./moderation.service";

const reportRepository = AppDataSource.getRepository(Report);
const userRepository = AppDataSource.getRepository(User);

export class ReportService {
    static async submitReport(
        reporterId: string,
        data: { reportedUserId?: string; roomId?: string; reason: ReportReason; description?: string }
    ) {
        if (!data.reportedUserId && !data.roomId) {
            throw new Error("Either reportedUserId or roomId is required");
        }
        if (data.reportedUserId && data.reportedUserId === reporterId) {
            throw new Error("Cannot report yourself");
        }

        // Delegate to ModerationService for consistent report creation
        const saved = await ModerationService.createReport(
            reporterId,
            data.reportedUserId || "",
            data.reason,
            data.description,
            data.roomId
        );

        // Auto-flag users with 3+ pending reports
        if (data.reportedUserId) {
            await this.autoFlagUser(data.reportedUserId);
        }

        return saved;
    }

    static async listReports(filters: { status?: string; type?: string }, limit: number = 20, offset: number = 0) {
        const query = reportRepository.createQueryBuilder("report")
            .leftJoinAndSelect("report.reporter", "reporter")
            .leftJoinAndSelect("report.reported_user", "reported_user")
            .orderBy("report.created_at", "DESC")
            .skip(offset)
            .take(limit);

        if (filters.status) {
            query.andWhere("report.status = :status", { status: filters.status });
        }
        if (filters.type === "user") {
            query.andWhere("report.reported_user_id IS NOT NULL");
        } else if (filters.type === "room") {
            query.andWhere("report.room_id IS NOT NULL");
        }

        const [reports, total] = await query.getManyAndCount();
        return { reports, total, limit, offset };
    }

    static async updateReportStatus(reportId: string, status: ReportStatus) {
        const report = await reportRepository.findOne({ where: { id: reportId } });
        if (!report) throw new Error("Report not found");

        report.status = status;
        report.reviewed_at = new Date();

        return await reportRepository.save(report);
    }

    private static async autoFlagUser(userId: string) {
        const pendingCount = await reportRepository.count({
            where: { reported_user_id: userId, status: ReportStatus.PENDING },
        });

        if (pendingCount >= 3) {
            await userRepository.update({ id: userId }, { flagged: true });
        }
    }
}
