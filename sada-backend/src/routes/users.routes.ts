import { Router } from "express";
import { UserController } from "../controllers/users.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/:id", UserController.getProfile);
router.put("/:id", authMiddleware, UserController.updateProfile);
router.delete("/:id", authMiddleware, UserController.deleteAccount);

export default router;
