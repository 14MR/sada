import { AppDataSource } from "../config/database";
import { Room } from "../models/Room";

const roomRepository = AppDataSource.getRepository(Room);

export class DiscoveryService {
    /**
     * Trending rooms: live rooms ranked by a composite score
     * Score = listener_count * recency_boost
     * recency_boost = 1.0 if <30min old, 0.5 if <2h, 0.25 if <6h, 0.1 otherwise
     */
    static async getTrending(limit: number = 20): Promise<Room[]> {
        const rooms = await roomRepository
            .createQueryBuilder("room")
            .leftJoinAndSelect("room.host", "host")
            .where("room.status = :status", { status: "live" })
            .orderBy(
                `(CASE 
                    WHEN room.started_at > NOW() - INTERVAL '30 minutes' THEN room.listener_count * 1.0
                    WHEN room.started_at > NOW() - INTERVAL '2 hours' THEN room.listener_count * 0.5
                    WHEN room.started_at > NOW() - INTERVAL '6 hours' THEN room.listener_count * 0.25
                    ELSE room.listener_count * 0.1
                END)`,
                "DESC"
            )
            .limit(limit)
            .getMany();

        return rooms;
    }

    /**
     * Upcoming scheduled rooms (next 24 hours)
     */
    static async getUpcoming(limit: number = 10): Promise<Room[]> {
        return await roomRepository
            .createQueryBuilder("room")
            .leftJoinAndSelect("room.host", "host")
            .where("room.scheduled_at IS NOT NULL")
            .andWhere("room.scheduled_at > NOW()")
            .andWhere("room.scheduled_at < NOW() + INTERVAL '24 hours'")
            .andWhere("room.status = :status", { status: "scheduled" })
            .orderBy("room.scheduled_at", "ASC")
            .limit(limit)
            .getMany();
    }

    /**
     * Recommended rooms for a user based on followed creators
     */
    static async getForYou(userId: string, limit: number = 20): Promise<Room[]> {
        const followedRooms = await roomRepository
            .createQueryBuilder("room")
            .leftJoinAndSelect("room.host", "host")
            .innerJoin(
                "follows",
                "f",
                "f.following_id = room.host_id AND f.follower_id = :userId",
                { userId }
            )
            .where("room.status = :status", { status: "live" })
            .orderBy("room.listener_count", "DESC")
            .limit(limit)
            .getMany();

        // If not enough from follows, fill with trending
        if (followedRooms.length < limit) {
            const trending = await this.getTrending(limit - followedRooms.length);
            const followedIds = new Set(followedRooms.map((r) => r.id));
            const fill = trending.filter((r) => !followedIds.has(r.id));
            return [...followedRooms, ...fill];
        }

        return followedRooms;
    }
}
