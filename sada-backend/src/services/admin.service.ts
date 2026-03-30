import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { Room } from "../models/Room";
import { Report, ReportStatus } from "../models/Report";
import { GemTransaction } from "../models/GemTransaction";
import { AdminAction } from "../models/AdminAction";

const userRepo = AppDataSource.getRepository(User);
const roomRepo = AppDataSource.getRepository(Room);
const reportRepo = AppDataSource.getRepository(Report);
const gemRepo = AppDataSource.getRepository(GemTransaction);
const adminActionRepo = AppDataSource.getRepository(AdminAction);

export class AdminService {
    static async getStats() {
        const [totalUsers, totalRooms, liveRooms, pendingReports, gemsTransacted] =
            await Promise.all([
                userRepo.count(),
                roomRepo.count(),
                roomRepo.count({ where: { status: "live" } }),
                reportRepo.count({ where: { status: ReportStatus.PENDING } }),
                gemRepo.createQueryBuilder("tx").select("COALESCE(SUM(tx.amount), 0)", "total").getRawOne(),
            ]);

        return {
            totalUsers,
            rooms: { live: liveRooms, total: totalRooms },
            gemsTransacted: Number(gemsTransacted.total),
            reportsPending: pendingReports,
        };
    }

    static async getUsers(limit = 20, offset = 0) {
        const [users, total] = await userRepo.findAndCount({
            order: { created_at: "DESC" },
            take: limit,
            skip: offset,
        });
        return { users, total, limit, offset };
    }

    static async getReports(limit = 20, offset = 0) {
        const [reports, total] = await reportRepo.findAndCount({
            relations: ["reporter", "reported_user"],
            order: { created_at: "DESC" },
            take: limit,
            skip: offset,
        });
        return { reports, total, limit, offset };
    }

    static async banUser(userId: string, adminKey: string) {
        const user = await userRepo.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");

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
        if (!user) throw new Error("User not found");

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

    static async reviewReport(reportId: string, action: "reviewed" | "dismissed", adminKey: string) {
        const report = await reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new Error("Report not found");

        report.status = action === "reviewed" ? ReportStatus.ACTIONED : ReportStatus.DISMISSED;
        await reportRepo.save(report);

        const log = new AdminAction();
        log.admin_key = adminKey;
        log.action_type = action;
        log.target_report_id = reportId;
        log.target_user_id = report.reported_user_id;
        await adminActionRepo.save(log);

        return report;
    }
}
