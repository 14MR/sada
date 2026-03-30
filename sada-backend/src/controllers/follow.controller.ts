import { Response } from "express";
import { FollowService } from "../services/follow.service";
import { AuthenticatedRequest } from "../middleware/auth";

export class FollowController {
    static async follow(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user!.id;

            await FollowService.followUser(userId, id);
            return res.status(200).json({ success: true, message: "Followed successfully" });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async unfollow(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user!.id;

            await FollowService.unfollowUser(userId, id);
            return res.status(200).json({ success: true, message: "Unfollowed successfully" });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async listFollowers(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const followers = await FollowService.getFollowers(id);
            return res.json(followers);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async listFollowing(req: AuthenticatedRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const following = await FollowService.getFollowing(id);
            return res.json(following);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
