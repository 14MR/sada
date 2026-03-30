import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";

const router = Router();

router.get("/", CategoryController.list);
router.get("/:slug/rooms", CategoryController.getRooms);

export default router;
