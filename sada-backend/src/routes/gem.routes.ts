import { Router } from "express";
import { GemController } from "../controllers/gem.controller";
import { validateBody } from "../middleware/validation";
import { PurchaseGemsDto, GiftGemsDto } from "../dto/gem.dto";

const router = Router();

router.post("/purchase", validateBody(PurchaseGemsDto), GemController.purchase);
router.post("/gift", validateBody(GiftGemsDto), GemController.gift);
router.get("/balance/:userId", GemController.getBalance);
router.get("/history/:userId", GemController.getHistory);

export default router;
