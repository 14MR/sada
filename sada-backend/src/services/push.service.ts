import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../models/Notification";
import { NotificationPreferenceService } from "./notification-preference.service";
import { NotificationPreferenceType } from "../models/NotificationPreference";
import logger from "../config/logger";

interface ExpoPushMessage {
    to: string | string[];
    title?: string;
    body?: string;
    data?: Record<string, any>;
    sound?: string;
}

interface PushTicket {
    status: "ok" | "error";
    id?: string;
    message?: string;
}

// In-memory token store (prod should use DB/Redis)
const userTokens = new Map<string, Set<string>>();
const topicSubscriptions = new Map<string, Set<string>>();

export class PushService {
    /** Register an Expo push token for a user */
    static async registerToken(userId: string, token: string): Promise<void> {
        if (!token.startsWith("ExponentPushToken[") && process.env.NODE_ENV !== "test") {
            throw new Error("Invalid Expo push token format");
        }

        if (!userTokens.has(userId)) {
            userTokens.set(userId, new Set());
        }
        userTokens.get(userId)!.add(token);
    }

    /** Remove a push token for a user */
    static async unregisterToken(userId: string, token: string): Promise<void> {
        const tokens = userTokens.get(userId);
        if (tokens) {
            tokens.delete(token);
            if (tokens.size === 0) {
                userTokens.delete(userId);
            }
        }
    }

    /** Send push notification to a specific user */
    static async sendToUser(
        userId: string,
        title: string,
        body: string,
        data?: Record<string, any>
    ): Promise<PushTicket[]> {
        const tokens = userTokens.get(userId);
        if (!tokens || tokens.size === 0) return [];

        const messages: ExpoPushMessage[] = Array.from(tokens).map(token => ({
            to: token,
            title,
            body,
            data,
            sound: "default",
        }));

        return this.sendPushMessages(messages);
    }

    /** Send push notification to all users subscribed to a topic */
    static async sendToTopic(
        topic: string,
        title: string,
        body: string,
        data?: Record<string, any>
    ): Promise<PushTicket[]> {
        const subscriberIds = topicSubscriptions.get(topic);
        if (!subscriberIds || subscriberIds.size === 0) return [];

        const allTokens: string[] = [];
        for (const userId of subscriberIds) {
            const tokens = userTokens.get(userId);
            if (tokens) {
                allTokens.push(...Array.from(tokens));
            }
        }

        if (allTokens.length === 0) return [];

        const messages: ExpoPushMessage[] = allTokens.map(token => ({
            to: token,
            title,
            body,
            data,
            sound: "default",
        }));

        return this.sendPushMessages(messages);
    }

    /** Subscribe a user to a topic */
    static async subscribeToTopic(userId: string, topic: string): Promise<void> {
        if (!topicSubscriptions.has(topic)) {
            topicSubscriptions.set(topic, new Set());
        }
        topicSubscriptions.get(topic)!.add(userId);
    }

    /** Unsubscribe a user from a topic */
    static async unsubscribeFromTopic(userId: string, topic: string): Promise<void> {
        const subscribers = topicSubscriptions.get(topic);
        if (subscribers) {
            subscribers.delete(userId);
        }
    }

    /** Internal: send push messages via Expo Push API */
    private static async sendPushMessages(messages: ExpoPushMessage[]): Promise<PushTicket[]> {
        if (process.env.NODE_ENV === "test") {
            return messages.map(() => ({ status: "ok", id: `test_${Date.now()}` }));
        }

        try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify(messages),
            });

            const result = await response.json();
            return result.data || [];
        } catch (err) {
            logger.error({ err }, "Push notification send failed");
            return messages.map(() => ({ status: "error", message: String(err) }));
        }
    }

    /** Map NotificationType to NotificationPreferenceType */
    private static typeToPreferenceType(type: NotificationType): NotificationPreferenceType | null {
        const mapping: Partial<Record<NotificationType, NotificationPreferenceType>> = {
            [NotificationType.ROOM_STARTED]: NotificationPreferenceType.ROOM_STARTED,
            [NotificationType.ROOM_SCHEDULED]: NotificationPreferenceType.ROOM_SCHEDULED,
            [NotificationType.FOLLOW]: NotificationPreferenceType.NEW_FOLLOWER,
            [NotificationType.GIFT]: NotificationPreferenceType.GEM_RECEIVED,
            [NotificationType.SPEAKER_APPROVED]: NotificationPreferenceType.SPEAKER_REQUEST,
            [NotificationType.SPEAKER_REJECTED]: NotificationPreferenceType.SPEAKER_REQUEST,
        };
        return mapping[type] ?? null;
    }

    /** Create in-app notification + push notification together */
    static async notifyWithPush(
        userId: string,
        type: NotificationType,
        title: string,
        body?: string,
        data?: Record<string, any>
    ): Promise<void> {
        // Check notification preference before sending
        const prefType = this.typeToPreferenceType(type);
        if (prefType) {
            const enabled = await NotificationPreferenceService.isEnabled(userId, prefType);
            if (!enabled) return;
        }

        // Create in-app notification
        await NotificationService.create(userId, type, title, body, data);

        // Send push notification (non-blocking)
        this.sendToUser(userId, title, body || "", data).catch(err => {
            logger.warn({ err }, "Push notification failed");
        });
    }
}
