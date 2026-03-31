import { AppDataSource } from "../config/database";
import { UserActivity, ActivityType } from "../models/UserActivity";
import { LessThan } from "typeorm";

const activityRepository = AppDataSource.getRepository(UserActivity);

export class ActivityService {
    /** Record a new activity (fire-and-forget style) */
    static async record(userId: string, type: ActivityType, metadata?: Record<string, any>) {
        const activity = activityRepository.create({
            userId,
            type,
            metadata: metadata || null,
        });
        return await activityRepository.save(activity);
    }

    /** Get recent activity for a user (last 30 days) */
    static async getUserActivity(userId: string, limit: number = 50, offset: number = 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [activities, total] = await activityRepository.findAndCount({
            where: {
                userId,
                createdAt: LessThan(new Date()) as any,
            },
            order: { createdAt: "DESC" },
            skip: offset,
            take: limit,
        });

        // Filter to last 30 days in JS for SQLite compatibility
        const filtered = activities.filter((a) => new Date(a.createdAt) >= thirtyDaysAgo);

        return { activities: filtered, total: filtered.length, limit, offset };
    }
}
