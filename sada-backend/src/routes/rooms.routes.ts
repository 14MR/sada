import { Router } from "express";
import { RoomController } from "../controllers/rooms.controller";
import { SpeakerRequestController } from "../controllers/speaker-request.controller";

const router = Router();

router.post("/", RoomController.create);
router.get("/", RoomController.list);
router.get("/search", RoomController.search);
router.get("/:id", RoomController.get);
router.post("/:id/join", RoomController.join);
router.post("/:id/leave", RoomController.leave);
router.post("/:id/speakers", RoomController.manageSpeaker);
router.post("/:id/end", RoomController.end);

// Speaker request queue (raise hand)
router.post("/:id/raise-hand", SpeakerRequestController.raiseHand);
router.get("/:id/speaker-queue", SpeakerRequestController.getQueue);
router.post("/:id/approve-speaker/:requestId", SpeakerRequestController.approve);
router.post("/:id/reject-speaker/:requestId", SpeakerRequestController.reject);
router.post("/:id/cancel-hand", SpeakerRequestController.cancel);

export default router;
