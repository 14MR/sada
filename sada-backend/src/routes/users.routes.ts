import { Router } from "express";
import { UserController } from "../controllers/users.controller";
import { ProfileController } from "../controllers/profile.controller";
import { validate } from "../middleware/validation";
import { updateProfileSchema } from "../validators/user.validator";

const router = Router();

// Profile routes — static paths before :id param routes
router.get("/suggested", ProfileController.suggestedUsers);
router.get("/:id/profile", ProfileController.getProfile);
router.patch("/me/profile", validate(updateProfileSchema), ProfileController.updateProfile);

// Existing user CRUD routes
router.get("/:id", UserController.getProfile);
router.put("/:id", UserController.updateProfile);
router.delete("/:id", UserController.deleteAccount);

export default router;
