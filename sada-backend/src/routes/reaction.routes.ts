import { Router } from "express";
import { ReactionController } from "../controllers/reaction.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { addReactionSchema, removeReactionSchema } from "../validators/reaction.validator";

const router = Router();

router.post("/", authenticate, validate(addReactionSchema), ReactionController.addReaction);
router.delete("/", authenticate, validate(removeReactionSchema, "query"), ReactionController.removeReaction);
router.get("/:messageId", ReactionController.getMessageReactions);

export default router;
