import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { Room } from "../models/Room";
import { Report, ReportStatus } from "../models/Report";
import { GemTransaction } from "../models/GemTransaction";
import { AdminAction } from "../models/AdminAction";
import { FindOptionsWhere } from "typeorm";

const userRepo = AppDataSource.getRepository(User);
const roomRepo = AppDataSource.getRepository(Room);
const reportRepo = AppDataSource.getRepository(Report);
const gemRepo = AppDataSource.getRepository(GemTransaction);
const adminActionRepo = AppDataSource.getRepository(AdminAction);

export class AdminService {
    static async getStats() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalUsers, totalRooms, totalReports, gemsAllTimeResult, gemsTodayResult] =
            await Promise.all([
                userRepo.count(),
                roomRepo.count(),
                reportRepo.count(),
                gemRepo.createQueryBuilder("tx").select("COALESCE(SUM(tx.amount), 0)", "total").getRawOne(),
                gemRepo.createQueryBuilder("tx")
                    .select("COALESCE(SUM(tx.amount), 0)", "total")
                    .where("tx.created_at >= :todayStart", { todayStart })
                    .getRawOne(),
            ]);

        return {
            totalUsers,
            totalRooms,
            totalReports,
            gemsTransacted: {
                allTime: Number(gemsAllTimeResult.total),
                today: Number(gemsTodayResult.total),
            },
        };
    }

    static async getReports(status?: string, limit = 20, offset = 0) {
        const where: FindOptionsWhere<Report> = {};
        if (status && Object.values(ReportStatus).includes(status as ReportStatus)) {
            where.status = status as ReportStatus;
        }

        const [reports, total] = await reportRepo.findAndCount({
            where,
            relations: ["reporter", "reported_user"],
            order: { created_at: "DESC" },
            take: limit,
            skip: offset,
        });

        return { reports, total, limit, offset };
    }

    static async reviewReport(
        reportId: string,
        action: "actioned" | "dismissed",
        banUser: boolean,
        adminKey: string
    ) {
        const report = await reportRepo.findOne({
            where: { id: reportId },
        });
        if (!report) throw new Error("Report not found");

        report.status = action === "actioned" ? ReportStatus.ACTIONED : ReportStatus.DISMISSED;
        await reportRepo.save(report);

        if (banUser && report.reported_user_id) {
            await userRepo.update(report.reported_user_id, { banned: true });
        }

        const log = new AdminAction();
        log.admin_key = adminKey;
        log.action_type = action;
        log.target_report_id = reportId;
        log.target_user_id = report.reported_user_id;
        log.details = { banUser };
        await adminActionRepo.save(log);

        return report;
    }

    static async getUsers(q?: string, banned?: string, limit = 20, offset = 0) {
        const qb = userRepo.createQueryBuilder("u");

        if (q) {
            qb.andWhere("u.username ILIKE :q", { q: `%${q}%` });
        }

        if (banned === "true") {
            qb.andWhere("u.banned = true");
        } else if (banned === "false") {
            qb.andWhere("u.banned = false");
        }

        qb.orderBy("u.created_at", "DESC").take(limit).skip(offset);

        const [users, total] = await qb.getManyAndCount();
        return { users, total, limit, offset };
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
}
