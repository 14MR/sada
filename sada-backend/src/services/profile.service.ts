import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { Follow } from "../models/Follow";
import { Room } from "../models/Room";
import { GemTransaction } from "../models/GemTransaction";

const userRepository = AppDataSource.getRepository(User);
const followRepository = AppDataSource.getRepository(Follow);
const roomRepository = AppDataSource.getRepository(Room);
const gemTransactionRepository = AppDataSource.getRepository(GemTransaction);

export class ProfileService {
    static async getPublicProfile(userId: string, requesterId?: string) {
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) return null;

        const [followersCount, followingCount, roomsHosted, totalListeners, gemsReceived] = await Promise.all([
            followRepository.count({ where: { following: { id: userId } } }),
            followRepository.count({ where: { follower: { id: userId } } }),
            roomRepository.count({ where: { host: { id: userId } } }),
            roomRepository.createQueryBuilder("room")
                .where("room.host_id = :userId", { userId })
                .select("COALESCE(SUM(room.listener_count), 0)", "total")
                .getRawOne()
                .then(r => Number(r?.total ?? 0)),
            gemTransactionRepository.createQueryBuilder("tx")
                .where("tx.receiver_id = :userId AND tx.type = 'gift'", { userId })
                .select("COALESCE(SUM(tx.amount), 0)", "total")
                .getRawOne()
                .then(r => Number(r?.total ?? 0)),
        ]);

        let isFollowedByMe = false;
        if (requesterId && requesterId !== userId) {
            isFollowedByMe = await followRepository.exists({
                where: { follower: { id: requesterId }, following: { id: userId } }
            });
        }

        return {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            bio: user.bio,
            avatar_url: user.avatar_url,
            is_creator: user.is_creator,
            verified: user.verified,
            twitter_handle: user.twitter_handle,
            instagram_handle: user.instagram_handle,
            language: user.language,
            created_at: user.created_at,
            stats: {
                rooms_hosted: roomsHosted,
                followers_count: followersCount,
                following_count: followingCount,
                total_listeners: totalListeners,
                gems_received: gemsReceived,
            },
            is_followed_by_me: isFollowedByMe,
        };
    }

    static async updateProfile(userId: string, updates: Partial<Pick<User, "bio" | "display_name" | "avatar_url" | "twitter_handle" | "instagram_handle" | "is_creator">>) {
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");

        if (updates.bio !== undefined && updates.bio !== null && updates.bio.length > 500) {
            throw new Error("Bio must be 500 characters or less");
        }

        const allowedFields = ["bio", "display_name", "avatar_url", "twitter_handle", "instagram_handle", "is_creator"] as const;
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                (user as any)[field] = updates[field];
            }
        }

        return await userRepository.save(user);
    }

    static async getSuggestedUsers(limit: number = 10) {
        const users = await userRepository
            .createQueryBuilder("user")
            .leftJoin("user.followers", "follow")
            .groupBy("user.id")
            .orderBy("COUNT(follow.id)", "DESC")
            .limit(limit)
            .select(["user.id", "user.username", "user.display_name", "user.avatar_url", "user.is_creator", "user.verified"])
            .addSelect("COUNT(follow.id)", "followers_count")
            .getRawMany();

        return users.map(u => ({
            id: u.user_id,
            username: u.user_username,
            display_name: u.user_display_name,
            avatar_url: u.user_avatar_url,
            is_creator: u.user_is_creator,
            verified: u.user_verified,
            followers_count: Number(u.followers_count),
        }));
    }
}
