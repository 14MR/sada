import { Router } from "express";
import { FollowController } from "../controllers/follow.controller";
import { validate } from "../middleware/validation";
import { followBodySchema } from "../validators/follow.validator";

const router = Router();

router.post("/:id/follow", validate(followBodySchema), FollowController.follow);
router.delete("/:id/follow", validate(followBodySchema), FollowController.unfollow);
router.get("/:id/followers", FollowController.listFollowers);
router.get("/:id/following", FollowController.listFollowing);

export default router;
