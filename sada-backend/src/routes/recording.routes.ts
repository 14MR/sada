import { Router } from "express";
import { RecordingController } from "../controllers/recording.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validation";
import { startRecordingSchema, stopRecordingSchema, listRecordingSchema } from "../validators/recording.validator";

const router = Router();

// Public routes
router.get("/", validate(listRecordingSchema, "query"), RecordingController.list);
router.get("/mine", authenticate, RecordingController.mine);
router.get("/:id", RecordingController.get);

// Authenticated routes
router.post("/start", authenticate, validate(startRecordingSchema), RecordingController.start);
router.post("/:id/stop", authenticate, validate(stopRecordingSchema), RecordingController.stop);
router.post("/:id/publish", authenticate, RecordingController.publish);
router.delete("/:id", authenticate, RecordingController.delete);

export default router;
