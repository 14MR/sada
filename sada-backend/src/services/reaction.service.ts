import { AppDataSource } from "../config/database";
import { ChatReaction } from "../models/ChatReaction";

const reactionRepository = AppDataSource.getRepository(ChatReaction);

export class ReactionService {
    static async addReaction(userId: string, messageId: string, roomId: string, emoji: string): Promise<ChatReaction> {
        const existing = await reactionRepository.findOne({
            where: { message_id: messageId, user_id: userId, emoji },
        });

        if (existing) {
            await reactionRepository.remove(existing);
            return existing;
        }

        const reaction = new ChatReaction();
        reaction.user_id = userId;
        reaction.message_id = messageId;
        reaction.room_id = roomId;
        reaction.emoji = emoji;

        return await reactionRepository.save(reaction);
    }

    static async removeReaction(userId: string, messageId: string, emoji: string): Promise<boolean> {
        const result = await reactionRepository.delete({
            message_id: messageId,
            user_id: userId,
            emoji,
        });
        return (result.affected ?? 0) > 0;
    }

    static async getMessageReactions(messageId: string): Promise<Record<string, { count: number; users: string[] }>> {
        const reactions = await reactionRepository.find({
            where: { message_id: messageId },
            order: { created_at: "ASC" },
        });

        const grouped: Record<string, { count: number; users: string[] }> = {};
        for (const reaction of reactions) {
            if (!grouped[reaction.emoji]) {
                grouped[reaction.emoji] = { count: 0, users: [] };
            }
            grouped[reaction.emoji].count++;
            grouped[reaction.emoji].users.push(reaction.user_id);
        }

        return grouped;
    }

    static async getRoomReactions(roomId: string, limit: number = 50): Promise<ChatReaction[]> {
        return await reactionRepository.find({
            where: { room_id: roomId },
            order: { created_at: "DESC" },
            take: limit,
        });
    }
}
