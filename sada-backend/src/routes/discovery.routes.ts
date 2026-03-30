import { Router } from "express";
import { DiscoveryController } from "../controllers/discovery.controller";

const router = Router();

router.get("/trending", DiscoveryController.trending);
router.get("/upcoming", DiscoveryController.upcoming);
router.get("/for-you", DiscoveryController.forYou);

export default router;
