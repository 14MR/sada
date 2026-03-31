import { Router } from "express";
import { FollowController } from "../controllers/follow.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/:id/follow", authMiddleware, FollowController.follow);
router.delete("/:id/follow", authMiddleware, FollowController.unfollow);
router.get("/:id/followers", FollowController.listFollowers);
router.get("/:id/following", FollowController.listFollowing);

export default router;
