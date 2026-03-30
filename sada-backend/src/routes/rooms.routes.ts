import { Router } from "express";
import { RoomController } from "../controllers/rooms.controller";

const router = Router();

router.post("/", RoomController.create);
router.get("/", RoomController.list);
router.get("/search", RoomController.search);
router.get("/:id", RoomController.get);
router.post("/:id/join", RoomController.join);
router.post("/:id/leave", RoomController.leave);
router.post("/:id/speakers", RoomController.manageSpeaker);
router.post("/:id/end", RoomController.end);

export default router;
