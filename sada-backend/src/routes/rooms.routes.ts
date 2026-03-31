import { Router } from "express";
import { RoomController } from "../controllers/rooms.controller";
import { SpeakerRequestController } from "../controllers/speaker-request.controller";
import { validate } from "../middleware/validation";
import { createRoomSchema, joinRoomSchema, leaveRoomSchema, manageSpeakerSchema, endRoomSchema, searchRoomSchema, scheduleRoomSchema, listScheduledSchema, startRoomSchema, trendingSchema, categoryRoomsSchema, listRoomsSchema, createInviteSchema, acceptInviteSchema, listInvitesSchema, recommendedSchema, createClipSchema, listClipsSchema } from "../validators/room.validator";

const router = Router();

// Static routes MUST come before /:id to avoid param matching
router.post("/schedule", validate(scheduleRoomSchema), RoomController.schedule);
router.get("/scheduled", validate(listScheduledSchema, "query"), RoomController.listScheduled);
router.get("/trending", validate(trendingSchema, "query"), RoomController.trending);
router.get("/recommended", validate(recommendedSchema, "query"), RoomController.recommended);
router.get("/categories/:slug", validate(categoryRoomsSchema, "query"), RoomController.listByCategory);
router.get("/clips/:id", RoomController.getClip);
router.post("/invites/:code/accept", validate(acceptInviteSchema), RoomController.acceptInvite);

// General routes
router.post("/", validate(createRoomSchema), RoomController.create);
router.get("/", validate(listRoomsSchema, "query"), RoomController.list);
router.get("/search", validate(searchRoomSchema, "query"), RoomController.search);
router.get("/:id", RoomController.get);
router.get("/:id/recordings", RoomController.getRoomRecordings);
router.get("/:id/replay", RoomController.getRoomReplay);
router.post("/:id/invites", validate(createInviteSchema), RoomController.createInvite);
router.get("/:id/invites", validate(listInvitesSchema, "query"), RoomController.listInvites);
router.post("/:id/clips", validate(createClipSchema), RoomController.createClip);
router.get("/:id/clips", validate(listClipsSchema, "query"), RoomController.listClips);
router.post("/:id/join", validate(joinRoomSchema), RoomController.join);
router.post("/:id/leave", validate(leaveRoomSchema), RoomController.leave);
router.post("/:id/speakers", validate(manageSpeakerSchema), RoomController.manageSpeaker);
router.post("/:id/end", validate(endRoomSchema), RoomController.end);
router.post("/:id/start", validate(startRoomSchema), RoomController.start);

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
