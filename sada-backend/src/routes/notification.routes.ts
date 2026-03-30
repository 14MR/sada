import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { validate } from "../middleware/validation";
import { listNotificationSchema, markReadSchema, markAllReadSchema, unreadCountSchema } from "../validators/notification.validator";

const router = Router();

router.get("/", validate(listNotificationSchema, "query"), NotificationController.list);
router.patch("/:id/read", validate(markReadSchema), NotificationController.markRead);
router.post("/read-all", validate(markAllReadSchema), NotificationController.markAllRead);
router.get("/unread-count", validate(unreadCountSchema, "query"), NotificationController.unreadCount);

export default router;
