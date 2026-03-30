import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { adminAuth } from "../middleware/admin";

const router = Router();

router.use(adminAuth);

router.get("/stats", AdminController.getStats);
router.get("/users", AdminController.getUsers);
router.get("/reports", AdminController.getReports);
router.post("/users/:id/ban", AdminController.banUser);
router.post("/users/:id/unban", AdminController.unbanUser);
router.post("/reports/:id/review", AdminController.reviewReport);

export default router;
