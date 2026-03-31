import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import { adminAuth } from "../middleware/admin";
import { validate } from "../middleware/validation";
import { adminUsersQuerySchema, adminPatchUserSchema } from "../validators/admin.validator";

const router = Router();

router.use(adminAuth);

router.get("/stats", AdminController.getStats);
router.get("/users", validate(adminUsersQuerySchema, "query"), AdminController.getUsers);
router.get("/reports", AdminController.getReports);
router.patch("/users/:id", validate(adminPatchUserSchema), AdminController.patchUser);
router.post("/users/:id/ban", AdminController.banUser);
router.post("/users/:id/unban", AdminController.unbanUser);
router.post("/reports/:id/review", AdminController.reviewReport);

export default router;
