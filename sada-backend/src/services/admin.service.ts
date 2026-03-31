import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { Room } from "../models/Room";
import { Report, ReportStatus } from "../models/Report";
import { GemTransaction } from "../models/GemTransaction";
import { AdminAction } from "../models/AdminAction";
import { UserPresence, PresenceStatus } from "../models/UserPresence";
import { LessThan } from "typeorm";

const userRepo = AppDataSource.getRepository(User);
const roomRepo = AppDataSource.getRepository(Room);
const reportRepo = AppDataSource.getRepository(Report);
const gemRepo = AppDataSource.getRepository(GemTransaction);
const adminActionRepo = AppDataSource.getRepository(AdminAction);
const presenceRepo = AppDataSource.getRepository(UserPresence);

export class AdminService {
    static async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalUsers,
            totalRooms,
            liveRooms,
            pendingReports,
            gemsTransacted,
            newUsersToday,
            activeRoomsToday,
        ] = await Promise.all([
            userRepo.count(),
            roomRepo.count(),
            roomRepo.count({ where: { status: "live" } }),
            reportRepo.count({ where: { status: ReportStatus.PENDING } }),
            gemRepo.createQueryBuilder("tx").select("COALESCE(SUM(tx.amount), 0)", "total").getRawOne(),
            userRepo.count({ where: { created_at: LessThan(new Date()) } })
                .then(async () => {
                    // Count users created today
                    return userRepo.createQueryBuilder("u")
                        .where("u.created_at >= :today", { today })
                        .getCount();
                }),
            roomRepo.createQueryBuilder("r")
                .where("r.started_at >= :today", { today })
                .getCount(),
        ]);

        return {
            totalUsers,
            rooms: { live: liveRooms, total: totalRooms },
            gemsTransacted: Number(gemsTransacted.total),
            reportsPending: pendingReports,
            activeRoomsToday,
            newUsersToday,
        };
    }

    static async getUsers(params: {
        limit?: number;
        offset?: number;
        search?: string;
        sort?: string;
        order?: "ASC" | "DESC";
        banned?: boolean;
        flagged?: boolean;
        is_creator?: boolean;
    } = {}) {
        const {
            limit = 20,
            offset = 0,
            search,
            sort = "created_at",
            order = "DESC",
            banned,
            flagged,
            is_creator,
        } = params;

        const qb = userRepo.createQueryBuilder("u");

        if (search) {
            qb.andWhere("(u.username LIKE :search OR u.display_name LIKE :search)", {
                search: `%${search}%`,
            });
        }
        if (banned !== undefined) {
            qb.andWhere("u.banned = :banned", { banned });
        }
        if (flagged !== undefined) {
            qb.andWhere("u.flagged = :flagged", { flagged });
        }
        if (is_creator !== undefined) {
            qb.andWhere("u.is_creator = :is_creator", { is_creator });
        }

        qb.orderBy(`u.${sort}`, order)
            .skip(offset)
            .take(limit);

        const [users, total] = await qb.getManyAndCount();
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
        log.admin_key = "[REDACTED]";
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
        log.admin_key = "[REDACTED]";
        log.action_type = "unban_user";
        log.target_user_id = userId;
        log.details = { banned: false };
        await adminActionRepo.save(log);

        return user;
    }

    static async patchUser(userId: string, updates: { banned?: boolean; verified?: boolean; is_creator?: boolean }, adminKey: string) {
        const user = await userRepo.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");

        if (updates.banned !== undefined) user.banned = updates.banned;
        if (updates.verified !== undefined) user.verified = updates.verified;
        if (updates.is_creator !== undefined) user.is_creator = updates.is_creator;

        await userRepo.save(user);

        const log = new AdminAction();
        log.admin_key = "[REDACTED]";
        log.action_type = "update_user";
        log.target_user_id = userId;
        log.details = updates;
        await adminActionRepo.save(log);

        return user;
    }

    static async reviewReport(reportId: string, action: "reviewed" | "dismissed", adminKey: string) {
        const report = await reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new Error("Report not found");

        report.status = action === "reviewed" ? ReportStatus.ACTIONED : ReportStatus.DISMISSED;
        await reportRepo.save(report);

        const log = new AdminAction();
        log.admin_key = "[REDACTED]";
        log.action_type = action;
        log.target_report_id = reportId;
        log.target_user_id = report.reported_user_id;
        await adminActionRepo.save(log);

        return report;
    }
}
