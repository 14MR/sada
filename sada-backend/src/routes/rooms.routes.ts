import { Router } from "express";
import { RoomController } from "../controllers/rooms.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { CreateRoomDto, ManageSpeakerDto } from "../dto/room.dto";

const router = Router();

router.post("/", requireAuth, validateBody(CreateRoomDto), RoomController.create);
router.get("/", RoomController.list);
router.get("/:id", RoomController.get);
router.post("/:id/join", requireAuth, RoomController.join);
router.post("/:id/leave", requireAuth, RoomController.leave);
router.post("/:id/speakers", requireAuth, validateBody(ManageSpeakerDto), RoomController.manageSpeaker);
router.post("/:id/end", requireAuth, RoomController.end);

export default router;
