import { Router } from "express";
import { ConversationController } from "../controllers/conversation.controller";
import { validate } from "../middleware/validation";
import { createConversationSchema, listConversationsSchema, getConversationSchema, sendMessageSchema, getMessagesSchema, editMessageSchema, updateConversationSchema, addParticipantSchema, markReadSchema } from "../validators/conversation.validator";

const router = Router();

// Create conversation (direct or group)
router.post("/", validate(createConversationSchema), ConversationController.create);

// List my conversations
router.get("/", validate(listConversationsSchema, "query"), ConversationController.list);

// Get single conversation
router.get("/:id", validate(getConversationSchema, "query"), ConversationController.get);

// Send message
router.post("/:id/messages", validate(sendMessageSchema), ConversationController.sendMessage);

// Get messages (cursor-based)
router.get("/:id/messages", validate(getMessagesSchema, "query"), ConversationController.getMessages);

// Edit message
router.patch("/:id/messages/:messageId", validate(editMessageSchema), ConversationController.editMessage);

// Delete message (soft)
router.delete("/:id/messages/:messageId", ConversationController.deleteMessage);

// Mark as read
router.post("/:id/read", ConversationController.markRead);

// Update conversation (group only)
router.patch("/:id", validate(updateConversationSchema), ConversationController.update);

// Add participant (group only)
router.post("/:id/participants", validate(addParticipantSchema), ConversationController.addParticipant);

// Remove participant (group only)
router.delete("/:id/participants/:userId", ConversationController.removeParticipant);

export default router;
