import { Router } from "express";
import { RoomController } from "../controllers/rooms.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, RoomController.create);
router.get("/", RoomController.list);
router.get("/:id", RoomController.get);
router.post("/:id/join", authMiddleware, RoomController.join);
router.post("/:id/leave", authMiddleware, RoomController.leave);
router.post("/:id/speakers", authMiddleware, RoomController.manageSpeaker);
router.post("/:id/end", authMiddleware, RoomController.end);

export default router;
