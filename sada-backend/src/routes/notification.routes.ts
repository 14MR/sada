import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";

const router = Router();

router.get("/", NotificationController.list);
router.patch("/:id/read", NotificationController.markRead);
router.post("/read-all", NotificationController.markAllRead);
router.get("/unread-count", NotificationController.unreadCount);

export default router;
