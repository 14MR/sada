import { Router } from "express";
import { RecordingController } from "../controllers/recording.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/", RecordingController.list);
router.get("/mine", authenticate, RecordingController.mine);
router.get("/:id", RecordingController.get);

// Authenticated routes
router.post("/start", authenticate, RecordingController.start);
router.post("/:id/stop", authenticate, RecordingController.stop);
router.post("/:id/publish", authenticate, RecordingController.publish);
router.delete("/:id", authenticate, RecordingController.delete);

export default router;
