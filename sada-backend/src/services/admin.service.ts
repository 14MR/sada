import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { Room } from "../models/Room";
import { GemTransaction } from "../models/GemTransaction";
import { Report, ReportStatus } from "../models/Report";
import { AdminAction } from "../models/AdminAction";

const userRepo = AppDataSource.getRepository(User);
const roomRepo = AppDataSource.getRepository(Room);
const gemTransactionRepo = AppDataSource.getRepository(GemTransaction);
const reportRepo = AppDataSource.getRepository(Report);
const adminActionRepo = AppDataSource.getRepository(AdminAction);

export class AdminService {
    static async getStats() {
        const totalUsers = await userRepo.count();
        const totalRooms = await roomRepo.count();
        const activeRooms = await roomRepo.count({ where: { status: "live" } });
        const pendingReports = await reportRepo.count({ where: { status: ReportStatus.PENDING } });

        const gemsResult = await gemTransactionRepo
            .createQueryBuilder("tx")
            .select("COALESCE(SUM(tx.amount), 0)", "total")
            .getRawOne();

        return {
            totalUsers,
            totalRooms,
            activeRooms,
            pendingReports,
            gemsTransacted: Number(gemsResult?.total || 0),
        };
    }

    static async getReports(status?: string, limit = 20, offset = 0) {
        const where: any = {};
        if (status && Object.values(ReportStatus).includes(status as ReportStatus)) {
            where.status = status as ReportStatus;
        }
        const [reports, total] = await reportRepo.findAndCount({
            where,
            order: { created_at: "DESC" },
            take: limit,
            skip: offset,
        });
        return { reports, total, limit, offset };
    }

    static async reviewReport(
        reportId: string,
        status: "actioned" | "dismissed",
        action: "warn" | "ban" | "none",
        adminKey: string
    ) {
        const report = await reportRepo.findOneBy({ id: reportId });
        if (!report) {
            throw new Error("Report not found");
        }

        report.status = status as ReportStatus;
        await reportRepo.save(report);

        if (action === "ban" && report.reported_user_id) {
            await userRepo.update(report.reported_user_id, { banned: true });
        }

        const log = new AdminAction();
        log.admin_key = adminKey;
        log.action_type = "review_report";
        log.target_report_id = reportId;
        log.target_user_id = report.reported_user_id;
        log.details = { status, action };
        await adminActionRepo.save(log);

        return report;
    }

    static async searchUsers(query?: string, limit = 20, offset = 0) {
        const qb = userRepo.createQueryBuilder("u");

        if (query) {
            qb.where("u.username ILIKE :q", { q: `%${query}%` });
        }

        qb.orderBy("u.created_at", "DESC")
            .take(limit)
            .skip(offset);

        const [users, total] = await qb.getManyAndCount();
        return { users, total, limit, offset };
    }

    static async banUser(userId: string, adminKey: string) {
        const user = await userRepo.findOneBy({ id: userId });
        if (!user) {
            throw new Error("User not found");
        }

        user.banned = true;
        await userRepo.save(user);

        const log = new AdminAction();
        log.admin_key = adminKey;
        log.action_type = "ban_user";
        log.target_user_id = userId;
        log.details = { banned: true };
        await adminActionRepo.save(log);

        return user;
    }

    static async unbanUser(userId: string, adminKey: string) {
        const user = await userRepo.findOneBy({ id: userId });
        if (!user) {
            throw new Error("User not found");
        }

        user.banned = false;
        await userRepo.save(user);

        const log = new AdminAction();
        log.admin_key = adminKey;
        log.action_type = "unban_user";
        log.target_user_id = userId;
        log.details = { banned: false };
        await adminActionRepo.save(log);

        return user;
    }
}
