import { AppDataSource } from "../config/database";
import { UserPresence, PresenceStatus } from "../models/UserPresence";

const presenceRepo = AppDataSource.getRepository(UserPresence);

const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function parseTimestamp(value: Date | string | null): number {
    if (!value) return NaN;
    const str = typeof value === "string" ? value : value.toISOString();
    // SQLite may store timestamps without timezone info (e.g. "2026-03-31 09:16:54.308").
    // Append "Z" to force UTC parsing so the result is consistent with Date.now().
    const normalized = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(str) && !(/[Zz+\-]\d{0,4}$/.test(str))
        ? str + "Z"
        : str;
    return new Date(normalized).getTime();
}

export class PresenceService {
    static async updatePresence(userId: string, status: PresenceStatus, currentRoomId?: string | null) {
        let presence = await presenceRepo.findOne({ where: { user_id: userId } });

        if (!presence) {
            presence = new UserPresence();
            presence.user_id = userId;
        }

        presence.status = status;
        presence.last_seen_at = new Date();
        presence.current_room_id = currentRoomId !== undefined ? currentRoomId : presence.current_room_id;

        const saved = await presenceRepo.save(presence);
        return saved;
    }

    static async getPresence(userId: string) {
        const presence = await presenceRepo.findOne({ where: { user_id: userId } });

        if (!presence) {
            return {
                user_id: userId,
                status: PresenceStatus.OFFLINE,
                last_seen_at: null,
                current_room_id: null,
            };
        }

        // Auto-set offline if last_seen_at is older than 5 minutes and not already offline
        if (presence.status !== PresenceStatus.OFFLINE && presence.last_seen_at) {
            const lastSeen = parseTimestamp(presence.last_seen_at);
            if (!isNaN(lastSeen) && Date.now() - lastSeen > INACTIVITY_THRESHOLD_MS) {
                return {
                    ...presence,
                    status: PresenceStatus.OFFLINE,
                };
            }
        }

        return presence;
    }

    static async getOnlineUserIds(roomId?: string): Promise<string[]> {
        const cutoff = new Date(Date.now() - INACTIVITY_THRESHOLD_MS);

        const qb = presenceRepo.createQueryBuilder("p")
            .select("p.user_id", "user_id")
            .where("p.status != :offline", { offline: PresenceStatus.OFFLINE })
            .andWhere("p.last_seen_at > :cutoff", { cutoff });

        if (roomId) {
            qb.andWhere("p.current_room_id = :roomId", { roomId });
        }

        const rows = await qb.getRawMany();
        return rows.map(r => r.user_id);
    }
}
