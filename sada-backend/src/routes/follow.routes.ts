import { Router } from "express";
import { FollowController } from "../controllers/follow.controller";

const router = Router();

// Route: /api/users/:id/follow
router.post("/:id/follow", FollowController.follow);
router.delete("/:id/follow", FollowController.unfollow);

// Route: /api/users/:id/followers
router.get("/:id/followers", FollowController.listFollowers);
router.get("/:id/following", FollowController.listFollowing);

// Note: These should ideally be registered under /api/users, but we can also have /api/follows if preferred.
// Given the pattern /api/users/:id/..., let's assume we maintain that structure in index.ts or users.routes.ts
// For now, I'll export this router to be mounted at /api/users
export default router;
