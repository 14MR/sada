import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import { validate } from "../middleware/validation";
import { categorySlugSchema } from "../validators/category.validator";

const router = Router();

router.get("/", CategoryController.list);
router.get("/:slug/rooms", validate(categorySlugSchema, "params"), CategoryController.getRooms);

export default router;
