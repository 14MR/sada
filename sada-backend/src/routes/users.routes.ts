import { Router } from "express";
import { UserController } from "../controllers/users.controller";
import { validateBody } from "../middleware/validation";
import { UpdateProfileDto } from "../dto/user.dto";

const router = Router();

router.get("/:id", UserController.getProfile);
router.put("/:id", validateBody(UpdateProfileDto), UserController.updateProfile);
router.delete("/:id", UserController.deleteAccount);

export default router;
