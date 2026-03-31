import { Router } from "express";
import { UserController } from "../controllers/users.controller";
import { ProfileController } from "../controllers/profile.controller";
import { BlockController } from "../controllers/block.controller";
import { ActivityController } from "../controllers/activity.controller";
import { NotificationPreferenceController } from "../controllers/notification-preference.controller";
import { PresenceController } from "../controllers/presence.controller";
import { validate } from "../middleware/validation";
import { updateProfileSchema } from "../validators/user.validator";
import { blockSchema } from "../validators/moderation.validator";
import { bulkUpdatePreferencesSchema } from "../validators/notification-preference.validator";
import { updatePresenceSchema } from "../validators/presence.validator";

const router = Router();

// Profile routes — static paths before :id param routes
router.get("/suggested", ProfileController.suggestedUsers);
router.get("/search", ProfileController.searchUsers);
router.get("/activity", ActivityController.getActivity);
router.get("/blocked", BlockController.listBlocked);
router.post("/block", validate(blockSchema), BlockController.block);
router.delete("/block/:userId", BlockController.unblock);

// Notification preferences
router.get("/notification-preferences", NotificationPreferenceController.get);
router.put("/notification-preferences", validate(bulkUpdatePreferencesSchema), NotificationPreferenceController.bulkUpdate);

// Presence
router.post("/presence", validate(updatePresenceSchema), PresenceController.update);

// Profile update
router.patch("/me/profile", validate(updateProfileSchema), ProfileController.updateProfile);

// Profile with public stats
router.get("/:id/profile", ProfileController.getProfile);

// Presence — must be before generic :id routes
router.get("/:id/presence", PresenceController.get);

// Existing user CRUD routes
router.get("/:id", UserController.getProfile);
router.put("/:id", UserController.updateProfile);
router.delete("/:id", UserController.deleteAccount);

export default router;
