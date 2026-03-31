import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { adminAuth } from "../middleware/admin";
import { validate } from "../middleware/validation";
import { submitReportSchema, updateReportStatusSchema, listReportsSchema } from "../validators/report.validator";

const router = Router();

// Authenticated routes
router.post("/", validate(submitReportSchema), ReportController.submit);

// Admin-only routes
router.get("/", adminAuth, validate(listReportsSchema, "query"), ReportController.list);
router.patch("/:id", adminAuth, validate(updateReportStatusSchema), ReportController.updateStatus);

export default router;
