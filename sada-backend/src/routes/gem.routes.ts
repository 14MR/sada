import { Router } from "express";
import { GemController } from "../controllers/gem.controller";

const router = Router();

// /api/gems/purchase
router.post("/purchase", GemController.purchase);

// /api/gems/gift
router.post("/gift", GemController.gift);

// /api/gems/balance/:userId
router.get("/balance/:userId", GemController.getBalance);

// /api/gems/history/:userId
router.get("/history/:userId", GemController.getHistory);

export default router;
