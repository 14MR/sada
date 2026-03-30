import { Router } from "express";
import { RoomController } from "../controllers/rooms.controller";
import { SpeakerRequestController } from "../controllers/speaker-request.controller";
import { validate } from "../middleware/validation";
import { createRoomSchema, joinRoomSchema, leaveRoomSchema, manageSpeakerSchema, endRoomSchema, searchRoomSchema } from "../validators/room.validator";

const router = Router();

router.post("/", validate(createRoomSchema), RoomController.create);
router.get("/", RoomController.list);
router.get("/search", validate(searchRoomSchema, "query"), RoomController.search);
router.get("/:id", RoomController.get);
router.post("/:id/join", validate(joinRoomSchema), RoomController.join);
router.post("/:id/leave", validate(leaveRoomSchema), RoomController.leave);
router.post("/:id/speakers", validate(manageSpeakerSchema), RoomController.manageSpeaker);
router.post("/:id/end", validate(endRoomSchema), RoomController.end);

// Speaker request RESTful endpoints
router.post("/:id/speaker-requests", SpeakerRequestController.raiseHand);
router.get("/:id/speaker-requests", SpeakerRequestController.getQueue);
router.patch("/:id/speaker-requests/:requestId", SpeakerRequestController.resolve);

// Legacy speaker request endpoints (backwards compatible)
router.post("/:id/raise-hand", SpeakerRequestController.raiseHand);
router.get("/:id/speaker-queue", SpeakerRequestController.getQueue);
router.post("/:id/approve-speaker/:requestId", SpeakerRequestController.approve);
router.post("/:id/reject-speaker/:requestId", SpeakerRequestController.reject);
router.post("/:id/cancel-hand", SpeakerRequestController.cancel);

export default router;
