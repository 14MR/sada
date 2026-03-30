import { Router } from "express";
import { AudioController } from "../controllers/audio.controller";
import { validate } from "../middleware/validation";
import {
    createSessionSchema,
    joinSessionSchema,
    renegotiateSchema,
    muteSchema,
} from "../validators/audio.validator";

const router = Router();

// Create a new SFU session for a room
router.post("/sessions", validate(createSessionSchema), AudioController.createSession);

// Look up the active session for a room
router.get("/sessions/room/:roomId", AudioController.getSessionByRoom);

// Join an existing session (SDP exchange)
router.post("/sessions/:sessionId/join", validate(joinSessionSchema), AudioController.joinSession);

// Leave a session
router.post("/sessions/:sessionId/leave", AudioController.leaveSession);

// List participants
router.get("/sessions/:sessionId/participants", AudioController.getParticipants);

// Renegotiate (ICE restart / track update)
router.post("/sessions/:sessionId/renegotiate", validate(renegotiateSchema), AudioController.renegotiate);

// Update mute state
router.post("/sessions/:sessionId/mute", validate(muteSchema), AudioController.setMuteState);

export default router;
