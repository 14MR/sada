import { In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Conversation, ConversationType } from "../models/Conversation";
import { ConversationParticipant, ParticipantRole } from "../models/ConversationParticipant";
import { Message, MessageType } from "../models/Message";
import { User } from "../models/User";
import { BlockService } from "./block.service";
import { ChatService } from "./chat.service";
import logger from "../config/logger";

const conversationRepository = AppDataSource.getRepository(Conversation);
const participantRepository = AppDataSource.getRepository(ConversationParticipant);
const messageRepository = AppDataSource.getRepository(Message);
const userRepository = AppDataSource.getRepository(User);

export class ConversationService {
    // ── Create Conversation ──────────────────────────────────────────

    static async createDirectConversation(userId: string, targetUserId: string) {
        if (userId === targetUserId) {
            throw new Error("Cannot create a conversation with yourself");
        }

        const target = await userRepository.findOneBy({ id: targetUserId });
        if (!target) {
            throw new Error("User not found");
        }

        // Check bidirectional block
        const isBlocked = await BlockService.isBlocked(userId, targetUserId);
        if (isBlocked) {
            throw new Error("Cannot message this user");
        }

        // Check if direct conversation already exists between these two users
        const myConversations = await participantRepository.find({
            where: { userId },
            select: ["conversationId"],
        });
        const myConvIds = myConversations.map((c) => c.conversationId);

        if (myConvIds.length > 0) {
            const theirConvIds = await participantRepository.find({
                where: { userId: targetUserId, conversationId: In(myConvIds) },
                select: ["conversationId"],
            });

            for (const { conversationId } of theirConvIds) {
                const conv = await conversationRepository.findOne({
                    where: { id: conversationId, type: ConversationType.DIRECT },
                });
                if (conv) {
                    // Check it's only 2 participants
                    const pCount = await participantRepository.count({
                        where: { conversationId },
                    });
                    if (pCount === 2) {
                        return await conversationRepository.findOne({
                            where: { id: conversationId },
                            relations: ["participants", "participants.user"],
                        });
                    }
                }
            }
        }

        const conversation = new Conversation();
        conversation.type = ConversationType.DIRECT;
        const saved = await conversationRepository.save(conversation);

        // Add both participants
        const p1 = new ConversationParticipant();
        p1.conversationId = saved.id;
        p1.userId = userId;
        p1.role = ParticipantRole.MEMBER;

        const p2 = new ConversationParticipant();
        p2.conversationId = saved.id;
        p2.userId = targetUserId;
        p2.role = ParticipantRole.MEMBER;

        await participantRepository.save([p1, p2]);

        return await conversationRepository.findOne({
            where: { id: saved.id },
            relations: ["participants", "participants.user"],
        });
    }

    static async createGroupConversation(userId: string, userIds: string[], name: string) {
        const allUserIds = [...new Set([userId, ...userIds])];

        if (allUserIds.length > 50) {
            throw new Error("Group can have at most 50 participants");
        }

        // Verify all users exist
        const users = await userRepository.findBy({ id: In(allUserIds) });
        if (users.length !== allUserIds.length) {
            throw new Error("One or more users not found");
        }

        // Check blocks between creator and all members
        for (const memberId of allUserIds) {
            if (memberId !== userId) {
                const isBlocked = await BlockService.isBlocked(userId, memberId);
                if (isBlocked) {
                    throw new Error("Cannot add a blocked user to the group");
                }
            }
        }

        const conversation = new Conversation();
        conversation.type = ConversationType.GROUP;
        conversation.name = name;
        const saved = await conversationRepository.save(conversation);

        // Add all participants - creator is admin
        const participants = allUserIds.map((uid) => {
            const p = new ConversationParticipant();
            p.conversationId = saved.id;
            p.userId = uid;
            p.role = uid === userId ? ParticipantRole.ADMIN : ParticipantRole.MEMBER;
            return p;
        });

        await participantRepository.save(participants);

        return await conversationRepository.findOne({
            where: { id: saved.id },
            relations: ["participants", "participants.user"],
        });
    }

    // ── List Conversations ───────────────────────────────────────────

    static async listConversations(userId: string, limit: number = 20, offset: number = 0) {
        const myConversations = await participantRepository.find({
            where: { userId },
            select: ["conversationId"],
        });

        const conversationIds = myConversations.map((c) => c.conversationId);
        if (conversationIds.length === 0) {
            return [];
        }

        // Get conversations ordered by most recent update
        const conversations = await conversationRepository
            .createQueryBuilder("conv")
            .leftJoinAndSelect("conv.participants", "participant")
            .leftJoinAndSelect("participant.user", "user")
            .where("conv.id IN (:...ids)", { ids: conversationIds })
            .orderBy("conv.updated_at", "DESC")
            .skip(offset)
            .take(limit)
            .getMany();

        // Get last message and unread count for each conversation
        const result = await Promise.all(
            conversations.map(async (conv) => {
                const lastMessage = await messageRepository
                    .createQueryBuilder("msg")
                    .leftJoinAndSelect("msg.sender", "sender")
                    .where("msg.conversationId = :cid", { cid: conv.id })
                    .andWhere("msg.deleted_at IS NULL")
                    .orderBy("msg.created_at", "DESC")
                    .getOne();

                // Get unread count
                const myParticipant = await participantRepository.findOne({
                    where: { conversationId: conv.id, userId },
                });
                const lastReadAt = myParticipant?.last_read_at;
                let unreadCount: number;
                if (lastReadAt) {
                    unreadCount = await messageRepository
                        .createQueryBuilder("msg")
                        .where("msg.conversationId = :cid", { cid: conv.id })
                        .andWhere("msg.deleted_at IS NULL")
                        .andWhere("msg.created_at > :lastRead", { lastRead: lastReadAt })
                        .getCount();
                } else {
                    unreadCount = await messageRepository
                        .createQueryBuilder("msg")
                        .where("msg.conversationId = :cid", { cid: conv.id })
                        .andWhere("msg.deleted_at IS NULL")
                        .getCount();
                }

                return {
                    ...conv,
                    lastMessage,
                    unreadCount,
                };
            })
        );

        return result;
    }

    // ── Get Conversation ─────────────────────────────────────────────

    static async getConversation(userId: string, conversationId: string, messageLimit: number = 50) {
        const isParticipant = await participantRepository.findOne({
            where: { conversationId, userId },
        });
        if (!isParticipant) {
            throw new Error("Not a participant in this conversation");
        }

        const conversation = await conversationRepository.findOne({
            where: { id: conversationId },
            relations: ["participants", "participants.user"],
        });
        if (!conversation) {
            throw new Error("Conversation not found");
        }

        const messages = await messageRepository
            .createQueryBuilder("msg")
            .leftJoinAndSelect("msg.sender", "sender")
            .where("msg.conversationId = :cid", { cid: conversationId })
            .andWhere("msg.deleted_at IS NULL")
            .orderBy("msg.created_at", "DESC")
            .take(messageLimit)
            .getMany();

        return {
            ...conversation,
            messages: messages.reverse(),
        };
    }

    // ── Send Message ─────────────────────────────────────────────────

    static async sendMessage(userId: string, conversationId: string, content: string, type: MessageType = MessageType.TEXT, metadata?: Record<string, any> | null) {
        const participant = await participantRepository.findOne({
            where: { conversationId, userId },
        });
        if (!participant) {
            throw new Error("Not a participant in this conversation");
        }

        const message = new Message();
        message.conversationId = conversationId;
        message.senderId = userId;
        message.content = content;
        message.type = type;
        message.metadata = metadata || null;

        const saved = await messageRepository.save(message);

        // Update conversation's updatedAt
        await conversationRepository.update(conversationId, { updated_at: new Date() } as any);

        // Load sender relation for response
        const result = await messageRepository.findOne({
            where: { id: saved.id },
            relations: ["sender"],
        });

        // Emit socket event to all participants
        try {
            const chatService = ChatService.getInstance();
            const participants = await participantRepository.find({
                where: { conversationId },
                select: ["userId"],
            });
            for (const p of participants) {
                chatService.sendToUser(p.userId, "new_message", result);
            }
        } catch (e) {
            logger.warn({ err: e }, "Failed to emit socket event");
        }

        return result;
    }

    // ── Get Messages ─────────────────────────────────────────────────

    static async getMessages(userId: string, conversationId: string, limit: number = 50, before?: string, after?: string) {
        const participant = await participantRepository.findOne({
            where: { conversationId, userId },
        });
        if (!participant) {
            throw new Error("Not a participant in this conversation");
        }

        const query = messageRepository
            .createQueryBuilder("msg")
            .leftJoinAndSelect("msg.sender", "sender")
            .where("msg.conversationId = :conversationId", { conversationId })
            .andWhere("msg.deleted_at IS NULL")
            .orderBy("msg.created_at", "DESC")
            .addOrderBy("msg.id", "DESC")
            .take(limit);

        if (before) {
            const cursorMsg = await messageRepository.findOneBy({ id: before });
            if (cursorMsg) {
                query.andWhere("msg.created_at < :beforeDate", { beforeDate: cursorMsg.created_at });
            }
        }

        if (after) {
            const cursorMsg = await messageRepository.findOneBy({ id: after });
            if (cursorMsg) {
                query.andWhere("msg.created_at > :afterDate", { afterDate: cursorMsg.created_at });
            }
        }

        const messages = await query.getMany();
        return messages;
    }

    // ── Edit Message ─────────────────────────────────────────────────

    static async editMessage(userId: string, conversationId: string, messageId: string, content: string) {
        const message = await messageRepository.findOne({
            where: { id: messageId, conversationId },
        });
        if (!message) {
            throw new Error("Message not found");
        }
        if (message.senderId !== userId) {
            throw new Error("Can only edit your own messages");
        }
        if (message.deleted_at) {
            throw new Error("Cannot edit a deleted message");
        }

        message.content = content;
        message.edited_at = new Date();
        const saved = await messageRepository.save(message);

        const result = await messageRepository.findOne({
            where: { id: saved.id },
            relations: ["sender"],
        });

        // Emit socket event
        try {
            const chatService = ChatService.getInstance();
            const participants = await participantRepository.find({
                where: { conversationId },
                select: ["userId"],
            });
            for (const p of participants) {
                chatService.sendToUser(p.userId, "conversation_updated", { type: "message_edited", message: result });
            }
        } catch (e) {
            logger.warn({ err: e }, "Failed to emit socket event");
        }

        return result;
    }

    // ── Delete Message ───────────────────────────────────────────────

    static async deleteMessage(userId: string, conversationId: string, messageId: string) {
        const message = await messageRepository.findOne({
            where: { id: messageId, conversationId },
        });
        if (!message) {
            throw new Error("Message not found");
        }
        if (message.senderId !== userId) {
            throw new Error("Can only delete your own messages");
        }

        message.deleted_at = new Date();
        await messageRepository.save(message);

        // Emit socket event
        try {
            const chatService = ChatService.getInstance();
            const participants = await participantRepository.find({
                where: { conversationId },
                select: ["userId"],
            });
            for (const p of participants) {
                chatService.sendToUser(p.userId, "conversation_updated", { type: "message_deleted", messageId });
            }
        } catch (e) {
            logger.warn({ err: e }, "Failed to emit socket event");
        }

        return { success: true };
    }

    // ── Mark as Read ─────────────────────────────────────────────────

    static async markAsRead(userId: string, conversationId: string) {
        const participant = await participantRepository.findOne({
            where: { conversationId, userId },
        });
        if (!participant) {
            throw new Error("Not a participant in this conversation");
        }

        participant.last_read_at = new Date();
        await participantRepository.save(participant);

        return { success: true };
    }

    // ── Update Conversation ──────────────────────────────────────────

    static async updateConversation(userId: string, conversationId: string, updates: { name?: string }) {
        const conversation = await conversationRepository.findOne({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new Error("Conversation not found");
        }
        if (conversation.type !== ConversationType.GROUP) {
            throw new Error("Can only update group conversations");
        }

        const participant = await participantRepository.findOne({
            where: { conversationId, userId },
        });
        if (!participant) {
            throw new Error("Not a participant in this conversation");
        }
        if (participant.role !== ParticipantRole.ADMIN) {
            throw new Error("Only admins can update the conversation");
        }

        if (updates.name) {
            conversation.name = updates.name;
        }

        const saved = await conversationRepository.save(conversation);

        // Emit socket event
        try {
            const chatService = ChatService.getInstance();
            const participants = await participantRepository.find({
                where: { conversationId },
                select: ["userId"],
            });
            for (const p of participants) {
                chatService.sendToUser(p.userId, "conversation_updated", { type: "conversation_updated", conversation: saved });
            }
        } catch (e) {
            logger.warn({ err: e }, "Failed to emit socket event");
        }

        return saved;
    }

    // ── Add Participant ──────────────────────────────────────────────

    static async addParticipant(userId: string, conversationId: string, targetUserId: string) {
        const conversation = await conversationRepository.findOne({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new Error("Conversation not found");
        }
        if (conversation.type !== ConversationType.GROUP) {
            throw new Error("Can only add participants to group conversations");
        }

        const participant = await participantRepository.findOne({
            where: { conversationId, userId },
        });
        if (!participant) {
            throw new Error("Not a participant in this conversation");
        }
        if (participant.role !== ParticipantRole.ADMIN) {
            throw new Error("Only admins can add participants");
        }

        // Check if already a participant
        const existing = await participantRepository.findOne({
            where: { conversationId, userId: targetUserId },
        });
        if (existing) {
            throw new Error("User is already a participant");
        }

        // Check current participant count
        const count = await participantRepository.count({
            where: { conversationId },
        });
        if (count >= 50) {
            throw new Error("Group has reached maximum participants");
        }

        // Check blocks
        const isBlocked = await BlockService.isBlocked(userId, targetUserId);
        if (isBlocked) {
            throw new Error("Cannot add a blocked user");
        }

        const newParticipant = new ConversationParticipant();
        newParticipant.conversationId = conversationId;
        newParticipant.userId = targetUserId;
        newParticipant.role = ParticipantRole.MEMBER;
        await participantRepository.save(newParticipant);

        // Emit socket event
        try {
            const chatService = ChatService.getInstance();
            const participants = await participantRepository.find({
                where: { conversationId },
                select: ["userId"],
            });
            for (const p of participants) {
                chatService.sendToUser(p.userId, "conversation_updated", { type: "participant_added", conversationId, userId: targetUserId });
            }
        } catch (e) {
            logger.warn({ err: e }, "Failed to emit socket event");
        }

        return await conversationRepository.findOne({
            where: { id: conversationId },
            relations: ["participants", "participants.user"],
        });
    }

    // ── Remove Participant ───────────────────────────────────────────

    static async removeParticipant(userId: string, conversationId: string, targetUserId: string) {
        const conversation = await conversationRepository.findOne({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new Error("Conversation not found");
        }
        if (conversation.type !== ConversationType.GROUP) {
            throw new Error("Can only remove participants from group conversations");
        }

        // Self-leave is always allowed
        const isSelfLeave = userId === targetUserId;

        if (!isSelfLeave) {
            const participant = await participantRepository.findOne({
                where: { conversationId, userId },
            });
            if (!participant) {
                throw new Error("Not a participant in this conversation");
            }
            if (participant.role !== ParticipantRole.ADMIN) {
                throw new Error("Only admins can remove participants");
            }
        }

        const targetParticipant = await participantRepository.findOne({
            where: { conversationId, userId: targetUserId },
        });
        if (!targetParticipant) {
            throw new Error("User is not a participant");
        }

        await participantRepository.remove(targetParticipant);

        // Emit socket event
        try {
            const chatService = ChatService.getInstance();
            const participants = await participantRepository.find({
                where: { conversationId },
                select: ["userId"],
            });
            for (const p of participants) {
                chatService.sendToUser(p.userId, "conversation_updated", { type: "participant_removed", conversationId, userId: targetUserId });
            }
            chatService.sendToUser(targetUserId, "conversation_updated", { type: "removed_from_conversation", conversationId });
        } catch (e) {
            logger.warn({ err: e }, "Failed to emit socket event");
        }

        return { success: true };
    }
}
