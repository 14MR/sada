import { Router } from "express";
import { CreatorController } from "../controllers/creator.controller";

const router = Router();

router.get("/dashboard", CreatorController.dashboard);
router.get("/earnings", CreatorController.earnings);
router.get("/rooms", CreatorController.rooms);
router.get("/top-supporters", CreatorController.topSupporters);

export default router;
