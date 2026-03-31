import { AppDataSource } from "../config/database";
import { Room } from "../models/Room";
import { RoomParticipant } from "../models/RoomParticipant";
import { Follow } from "../models/Follow";

const roomRepository = AppDataSource.getRepository(Room);
const participantRepository = AppDataSource.getRepository(RoomParticipant);
const followRepository = AppDataSource.getRepository(Follow);

export class RecommendationService {
    static async getRecommended(userId: string, limit: number = 20, offset: number = 0) {
        // 1. Category affinity: categories of rooms user has joined before
        const userCategories = await participantRepository
            .createQueryBuilder("p")
            .innerJoinAndSelect("p.room", "room")
            .innerJoinAndSelect("room.category", "cat")
            .where("p.user_id = :userId", { userId })
            .andWhere("room.category_id IS NOT NULL")
            .getMany();

        const categoryAffinity: Record<string, number> = {};
        for (const p of userCategories) {
            const catId = (p.room as any).category?.id;
            if (catId) {
                categoryAffinity[catId] = (categoryAffinity[catId] || 0) + 1;
            }
        }

        // 2. Social signal: find rooms that user's followings are currently in
        const followings = await followRepository.find({
            where: { follower: { id: userId } },
            select: { following: { id: true } },
            relations: ["following"],
        });

        const followingIds = followings.map(f => f.following.id);

        let socialRoomIds: string[] = [];
        if (followingIds.length > 0) {
            const activeFollowingParticipants = await participantRepository
                .createQueryBuilder("p")
                .where("p.user_id IN (:...followingIds)", { followingIds })
                .andWhere("p.left_at IS NULL")
                .getMany();

            socialRoomIds = [...new Set(activeFollowingParticipants.map(p => p.room_id))];
        }

        // 3. Get all live rooms for scoring
        const liveRooms = await roomRepository
            .createQueryBuilder("room")
            .leftJoinAndSelect("room.host", "host")
            .leftJoinAndSelect("room.category", "category")
            .leftJoinAndSelect("room.participants", "participant")
            .where("room.status = :status", { status: 'live' })
            .getMany();

        // If no history, fallback to trending
        if (Object.keys(categoryAffinity).length === 0 && socialRoomIds.length === 0) {
            const scored = liveRooms.map(room => {
                const hoursSinceStart = (Date.now() - new Date(room.started_at).getTime()) / (1000 * 3600);
                const recencyBoost = 1000 / (hoursSinceStart + 1);
                const participantCount = room.participants?.length ?? 0;
                return { room, score: room.listener_count * recencyBoost + participantCount };
            });
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(offset, offset + limit).map(s => {
                const { participants, ...rest } = s.room as any;
                return rest;
            });
        }

        // Weighted scoring: category_affinity * 0.5 + social_signal * 0.3 + trending * 0.2
        const scored = liveRooms.map(room => {
            const catId = room.categoryId;
            const catScore = catId ? (categoryAffinity[catId] || 0) / (Object.values(categoryAffinity).reduce((a, b) => a + b, 0) || 1) : 0;

            const socialScore = socialRoomIds.includes(room.id) ? 1 : 0;

            const hoursSinceStart = (Date.now() - new Date(room.started_at).getTime()) / (1000 * 3600);
            const recencyBoost = 1000 / (hoursSinceStart + 1);
            const participantCount = room.participants?.length ?? 0;
            const trendingScore = (room.listener_count * recencyBoost + participantCount) / (liveRooms.length || 1);

            const score = catScore * 0.5 + socialScore * 0.3 + trendingScore * 0.2;
            return { room, score };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(offset, offset + limit).map(s => {
            const { participants, ...rest } = s.room as any;
            return rest;
        });
    }
}
