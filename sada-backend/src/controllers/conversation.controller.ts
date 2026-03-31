import { Request, Response } from "express";
import { ConversationService } from "../services/conversation.service";
import { MessageType } from "../models/Message";
import logger from "../config/logger";

export class ConversationController {
    static async create(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { type } = req.body;

            let conversation;
            if (type === "direct") {
                conversation = await ConversationService.createDirectConversation(userId, req.body.userId);
            } else if (type === "group") {
                conversation = await ConversationService.createGroupConversation(userId, req.body.userIds, req.body.name);
            } else {
                return res.status(400).json({ error: "Invalid conversation type" });
            }

            return res.status(201).json(conversation);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("Cannot") || error.message.includes("yourself") || error.message.includes("at most")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Create Conversation Error");
            return res.status(500).json({ error: "Failed to create conversation" });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const conversations = await ConversationService.listConversations(userId, limit, offset);
            return res.json(conversations);
        } catch (error) {
            logger.error({ err: error }, "List Conversations Error");
            return res.status(500).json({ error: "Failed to list conversations" });
        }
    }

    static async get(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const messageLimit = parseInt(req.query.messageLimit as string) || 50;

            const conversation = await ConversationService.getConversation(userId, conversationId, messageLimit);
            return res.json(conversation);
        } catch (error: any) {
            if (error.message.includes("Not a participant") || error.message.includes("not found")) {
                return res.status(403).json({ error: error.message });
            }
            logger.error({ err: error }, "Get Conversation Error");
            return res.status(500).json({ error: "Failed to get conversation" });
        }
    }

    static async sendMessage(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const { content, type, metadata } = req.body;

            const message = await ConversationService.sendMessage(
                userId,
                conversationId,
                content,
                (type as MessageType) || MessageType.TEXT,
                metadata
            );

            return res.status(201).json(message);
        } catch (error: any) {
            if (error.message.includes("Not a participant")) {
                return res.status(403).json({ error: error.message });
            }
            logger.error({ err: error }, "Send Message Error");
            return res.status(500).json({ error: "Failed to send message" });
        }
    }

    static async getMessages(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const limit = parseInt(req.query.limit as string) || 50;
            const before = req.query.before as string | undefined;
            const after = req.query.after as string | undefined;

            const messages = await ConversationService.getMessages(userId, conversationId, limit, before, after);
            return res.json(messages);
        } catch (error: any) {
            if (error.message.includes("Not a participant")) {
                return res.status(403).json({ error: error.message });
            }
            logger.error({ err: error }, "Get Messages Error");
            return res.status(500).json({ error: "Failed to get messages" });
        }
    }

    static async editMessage(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const messageId = req.params.messageId as string;
            const { content } = req.body;

            const message = await ConversationService.editMessage(userId, conversationId, messageId, content);
            return res.json(message);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("own messages") || error.message.includes("deleted")) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes("Not a participant")) {
                return res.status(403).json({ error: error.message });
            }
            logger.error({ err: error }, "Edit Message Error");
            return res.status(500).json({ error: "Failed to edit message" });
        }
    }

    static async deleteMessage(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const messageId = req.params.messageId as string;

            const result = await ConversationService.deleteMessage(userId, conversationId, messageId);
            return res.json(result);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("own messages")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Delete Message Error");
            return res.status(500).json({ error: "Failed to delete message" });
        }
    }

    static async markRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const result = await ConversationService.markAsRead(userId, conversationId);
            return res.json(result);
        } catch (error: any) {
            if (error.message.includes("Not a participant")) {
                return res.status(403).json({ error: error.message });
            }
            logger.error({ err: error }, "Mark Read Error");
            return res.status(500).json({ error: "Failed to mark as read" });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const updates = req.body;

            const conversation = await ConversationService.updateConversation(userId, conversationId, updates);
            return res.json(conversation);
        } catch (error: any) {
            if (error.message.includes("Not a participant") || error.message.includes("Only admins") || error.message.includes("not found") || error.message.includes("group")) {
                return res.status(403).json({ error: error.message });
            }
            logger.error({ err: error }, "Update Conversation Error");
            return res.status(500).json({ error: "Failed to update conversation" });
        }
    }

    static async addParticipant(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const { userId: targetUserId } = req.body;

            const conversation = await ConversationService.addParticipant(userId, conversationId, targetUserId);
            return res.json(conversation);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("Cannot") || error.message.includes("Only admins") || error.message.includes("already") || error.message.includes("maximum") || error.message.includes("group")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Add Participant Error");
            return res.status(500).json({ error: "Failed to add participant" });
        }
    }

    static async removeParticipant(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const conversationId = req.params.id as string;
            const targetUserId = req.params.userId as string;

            const result = await ConversationService.removeParticipant(userId, conversationId, targetUserId);
            return res.json(result);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("Only admins") || error.message.includes("not a participant") || error.message.includes("group")) {
                return res.status(400).json({ error: error.message });
            }
            logger.error({ err: error }, "Remove Participant Error");
            return res.status(500).json({ error: "Failed to remove participant" });
        }
    }
}
