import { Router } from "express";
import { RecordingController } from "../controllers/recording.controller";
import { validate } from "../middleware/validation";
import { startRecordingSchema, stopRecordingSchema, listRecordingSchema } from "../validators/recording.validator";

const router = Router();

// Public routes
router.get("/", validate(listRecordingSchema, "query"), RecordingController.list);
router.get("/mine", RecordingController.mine);
router.get("/:id", RecordingController.get);

// Authenticated routes
router.post("/start", validate(startRecordingSchema), RecordingController.start);
router.post("/:id/stop", validate(stopRecordingSchema), RecordingController.stop);
router.post("/:id/publish", RecordingController.publish);
router.delete("/:id", RecordingController.delete);

export default router;
