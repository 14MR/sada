import { Request, Response } from "express";
import { FollowService } from "../services/follow.service";
import { AuthRequest } from "../middleware/auth.middleware";

export class FollowController {
    static async follow(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const user = req.user!;

            await FollowService.followUser(user.id, id);
            return res.status(200).json({ success: true, message: "Followed successfully" });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async unfollow(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const user = req.user!;

            await FollowService.unfollowUser(user.id, id);
            return res.status(200).json({ success: true, message: "Unfollowed successfully" });
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }

    static async listFollowers(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const followers = await FollowService.getFollowers(id);
            return res.json(followers);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async listFollowing(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const following = await FollowService.getFollowing(id);
            return res.json(following);
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
