import { AppDataSource } from "../config/database";
import { Follow } from "../models/Follow";
import { User } from "../models/User";
import { ChatService } from "./chat.service";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../models/Notification";
import { BlockService } from "./block.service";
import { ActivityService } from "./activity.service";
import { ActivityType } from "../models/UserActivity";
import logger from "../config/logger";

const followRepository = AppDataSource.getRepository(Follow);
const userRepository = AppDataSource.getRepository(User);

export class FollowService {
    static async followUser(followerId: string, followingId: string) {
        if (followerId === followingId) throw new Error("Cannot follow yourself");

        // Block enforcement: check if either user has blocked the other
        const isBlocked = await BlockService.isBlocked(followerId, followingId);
        if (isBlocked) throw new Error("Cannot follow this user");

        const existingFollow = await followRepository.findOne({
            where: {
                follower: { id: followerId },
                following: { id: followingId }
            }
        });

        if (existingFollow) return existingFollow; // Already following

        // Check if users exist
        const follower = await userRepository.findOneBy({ id: followerId });
        const following = await userRepository.findOneBy({ id: followingId });

        if (!follower || !following) throw new Error("User not found");

        const follow = new Follow();
        follow.follower = follower;
        follow.following = following;

        const savedFollow = await followRepository.save(follow);

        // Notify the user being followed
        try {
            ChatService.getInstance().sendToUser(followingId, "notification", {
                type: "new_follower",
                message: `${follower.username || "Someone"} started following you`,
                followerId: follower.id
            });
        } catch (e) {
            logger.warn({ err: e }, "Failed to send socket notification");
        }

        try {
            await NotificationService.create(
                followingId,
                NotificationType.FOLLOW,
                `${follower.username || "Someone"} started following you`,
                undefined,
                { followerId: follower.id }
            );
        } catch (e) {
            logger.warn({ err: e }, "Failed to create notification");
        }

        // Record activity for the user being followed (fire-and-forget)
        ActivityService.record(followingId, ActivityType.FOLLOWER_GAINED, { followerId: follower.id }).catch(() => {});

        return savedFollow;
    }

    static async unfollowUser(followerId: string, followingId: string) {
        const follow = await followRepository.findOne({
            where: {
                follower: { id: followerId },
                following: { id: followingId }
            }
        });

        if (follow) {
            await followRepository.remove(follow);
            return true;
        }
        return false;
    }

    static async getFollowers(userId: string) {
        return await followRepository.find({
            where: { following: { id: userId } },
            relations: ["follower"]
        });
    }

    static async getFollowing(userId: string) {
        return await followRepository.find({
            where: { follower: { id: userId } },
            relations: ["following"]
        });
    }
}
