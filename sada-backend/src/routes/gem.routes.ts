import { Router } from "express";
import { GemController } from "../controllers/gem.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/purchase", authMiddleware, GemController.purchase);
router.post("/gift", authMiddleware, GemController.gift);
router.get("/balance/:userId", authMiddleware, GemController.getBalance);
router.get("/history/:userId", authMiddleware, GemController.getHistory);

export default router;
