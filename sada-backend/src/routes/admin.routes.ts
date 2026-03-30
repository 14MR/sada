import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { adminAuth } from "../middleware/admin";

const router = Router();

router.use(adminAuth);

router.get("/stats", AdminController.getStats);
router.get("/reports", AdminController.getReports);
router.post("/reports/:id/action", AdminController.reviewReport);
router.get("/users", AdminController.getUsers);
router.post("/users/:id/ban", AdminController.banUser);
router.post("/users/:id/unban", AdminController.unbanUser);

export default router;
