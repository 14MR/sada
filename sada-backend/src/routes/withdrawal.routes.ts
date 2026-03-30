import { Router } from "express";
import { WithdrawalController } from "../controllers/withdrawal.controller";
import { adminAuth } from "../middleware/admin";
import { validate } from "../middleware/validation";
import { requestWithdrawalSchema, processWithdrawalSchema } from "../validators/withdrawal.validator";

const router = Router();

// User routes (auth required)
router.post("/", validate(requestWithdrawalSchema), WithdrawalController.request);
router.get("/", WithdrawalController.list);

// Admin routes
router.get("/pending", adminAuth, WithdrawalController.pending);
router.post("/:id/process", adminAuth, validate(processWithdrawalSchema), WithdrawalController.process);

export default router;
