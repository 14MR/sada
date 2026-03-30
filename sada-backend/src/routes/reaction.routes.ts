import { Router } from "express";
import { ReactionController } from "../controllers/reaction.controller";
import { validate } from "../middleware/validation";
import { addReactionSchema, removeReactionSchema } from "../validators/reaction.validator";

const router = Router();

router.post("/", validate(addReactionSchema), ReactionController.addReaction);
router.delete("/", validate(removeReactionSchema, "query"), ReactionController.removeReaction);
router.get("/:messageId", ReactionController.getMessageReactions);

export default router;
