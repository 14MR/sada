import { Router } from "express";
import { WithdrawalController } from "../controllers/withdrawal.controller";
import { authenticate } from "../middleware/auth";
import { adminAuth } from "../middleware/admin";

const router = Router();

// User routes (auth required)
router.post("/", authenticate, WithdrawalController.request);
router.get("/", authenticate, WithdrawalController.list);

// Admin routes
router.get("/pending", adminAuth, WithdrawalController.pending);
router.post("/:id/process", adminAuth, WithdrawalController.process);

export default router;
