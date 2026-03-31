import { Router } from "express";
import { RoomController } from "../controllers/rooms.controller";

const router = Router();

router.get("/:id", RoomController.getClip);

export default router;
