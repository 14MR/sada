import { Router } from "express";
import { ModerationController } from "../controllers/moderation.controller";

const router = Router();

router.post("/report", ModerationController.report);
router.post("/block", ModerationController.block);
router.post("/unblock", ModerationController.unblock);
router.get("/blocked", ModerationController.listBlocked);

export default router;
