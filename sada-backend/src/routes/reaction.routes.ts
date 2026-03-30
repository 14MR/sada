import { Router } from "express";
import { ReactionController } from "../controllers/reaction.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/", authenticate, ReactionController.addReaction);
router.delete("/", authenticate, ReactionController.removeReaction);
router.get("/:messageId", ReactionController.getMessageReactions);

export default router;
