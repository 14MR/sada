import { AppDataSource } from "../config/database";
import { Notification, NotificationType } from "../models/Notification";

const notificationRepository = AppDataSource.getRepository(Notification);

export class NotificationService {
    static async create(
        userId: string,
        type: NotificationType,
        title: string,
        body?: string,
        data?: Record<string, any>
    ): Promise<Notification> {
        const notification = new Notification();
        notification.user_id = userId;
        notification.type = type;
        notification.title = title;
        notification.body = body ?? null;
        notification.data = data ?? null;

        return await notificationRepository.save(notification);
    }

    static async getForUser(userId: string, limit: number = 20, offset: number = 0): Promise<Notification[]> {
        return await notificationRepository.find({
            where: { user_id: userId },
            order: { created_at: "DESC" },
            take: limit,
            skip: offset,
        });
    }

    static async markRead(userId: string, notificationId: string): Promise<boolean> {
        const result = await notificationRepository.update(
            { id: notificationId, user_id: userId },
            { read: true }
        );
        return (result.affected ?? 0) > 0;
    }

    static async markAllRead(userId: string): Promise<number> {
        const result = await notificationRepository.update(
            { user_id: userId, read: false },
            { read: true }
        );
        return result.affected ?? 0;
    }

    static async getUnreadCount(userId: string): Promise<number> {
        return await notificationRepository.count({
            where: { user_id: userId, read: false },
        });
    }
}
