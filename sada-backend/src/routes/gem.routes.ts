import { Router } from "express";
import { GemController } from "../controllers/gem.controller";
import { validate } from "../middleware/validation";
import { purchaseGemSchema, giftGemSchema } from "../validators/gem.validator";

const router = Router();

router.post("/purchase", validate(purchaseGemSchema), GemController.purchase);
router.post("/gift", validate(giftGemSchema), GemController.gift);
router.get("/balance/:userId", GemController.getBalance);
router.get("/history/:userId", GemController.getHistory);

export default router;
