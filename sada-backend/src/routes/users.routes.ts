import { Router } from "express";
import { UserController } from "../controllers/users.controller";

const router = Router();

// In a real app, apply Auth middleware here
router.get("/:id", UserController.getProfile);
router.put("/:id", UserController.updateProfile);
router.delete("/:id", UserController.deleteAccount);

export default router;
