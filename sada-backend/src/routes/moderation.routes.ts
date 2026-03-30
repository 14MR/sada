import { Router } from "express";
import { ModerationController } from "../controllers/moderation.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { reportSchema, blockSchema, unblockSchema } from "../validators/moderation.validator";

const router = Router();

router.use(authenticate);

router.post("/report", validate(reportSchema), ModerationController.report);
router.post("/block", validate(blockSchema), ModerationController.block);
router.post("/unblock", validate(unblockSchema), ModerationController.unblock);
router.get("/blocked", ModerationController.listBlocked);

export default router;
