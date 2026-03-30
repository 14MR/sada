import { AppDataSource } from "../config/database";
import { Room } from "../models/Room";
import { RoomParticipant } from "../models/RoomParticipant";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { AudioService } from "./audio.service";

const roomRepository = AppDataSource.getRepository(Room);
const participantRepository = AppDataSource.getRepository(RoomParticipant);
const categoryRepository = AppDataSource.getRepository(Category);

export class RoomService {
    static async createRoom(host: User, title: string, categoryId?: string, description?: string, scheduledAt?: Date) {
        const room = new Room();
        room.host = host;
        room.title = title;
        room.categoryId = categoryId || null;
        room.description = description || "";
        room.scheduledAt = scheduledAt || null;
        room.status = 'live';

        const savedRoom = await roomRepository.save(room);

        // Provision Audio Session
        // We might store the sessionId in the room entity if needed, keeping it simple for now
        const audioSession = await AudioService.createSession(savedRoom.id, host.id);

        // Add host as participant
        const participant = new RoomParticipant();
        participant.room = savedRoom;
        participant.user = host;
        participant.role = 'host';

        await participantRepository.save(participant);

        // Return room + audio details (simple merge for MVP response)
        return { ...savedRoom, audio: audioSession };
    }

    static async getLiveRooms(categorySlug?: string, q?: string) {
        const query = roomRepository.createQueryBuilder("room")
            .leftJoinAndSelect("room.host", "host")
            .leftJoinAndSelect("room.category", "category")
            .where("room.status = :status", { status: 'live' })
            .orderBy("room.started_at", "DESC");

        if (categorySlug) {
            query.andWhere("category.slug = :slug", { slug: categorySlug });
        }

        if (q) {
            query.andWhere("(room.title ILIKE :q OR room.description ILIKE :q)", { q: `%${q}%` });
        }

        return await query.getMany();
    }

    static async getRoom(roomId: string) {
        return await roomRepository.findOne({
            where: { id: roomId },
            relations: ["host", "participants", "participants.user"]
        });
    }

    static async joinRoom(user: User, roomId: string) {
        const room = await roomRepository.findOneBy({ id: roomId });
        if (!room) throw new Error("Room not found");
        if (room.status !== 'live') throw new Error("Room has ended");

        let participant = await participantRepository.findOne({
            where: { room: { id: roomId }, user: { id: user.id } }
        });

        if (!participant) {
            participant = new RoomParticipant();
            participant.room = room;
            participant.user = user;
            participant.role = 'listener';

            await participantRepository.save(participant);

            room.listener_count += 1;
            await roomRepository.save(room);
        }

        // Generate Audio Token for joiner
        const audioConnection = await AudioService.generateToken(roomId, user.id, participant.role);

        return { participant, audio: audioConnection };
    }

    static async leaveRoom(userId: string, roomId: string) {
        const participant = await participantRepository.findOne({
            where: { room: { id: roomId }, user: { id: userId } }
        });

        if (participant) {
            participant.left_at = new Date();
            await participantRepository.remove(participant); // Or soft delete/mark as left

            // Update listener count
            const room = await roomRepository.findOneBy({ id: roomId });
            if (room && room.listener_count > 0) {
                room.listener_count -= 1;
                await roomRepository.save(room);
            }
        }
    }

    static async updateParticipantRole(requesterId: string, roomId: string, targetUserId: string, newRole: string) {
        const room = await roomRepository.findOne({
            where: { id: roomId },
            relations: ["host"]
        });

        if (!room) throw new Error("Room not found");

        // Authorization: Only host can change roles
        if (room.host.id !== requesterId) {
            throw new Error("Only the host can manage speakers");
        }

        const participant = await participantRepository.findOne({
            where: { room: { id: roomId }, user: { id: targetUserId } }
        });

        if (!participant) throw new Error("User is not in the room");

        const validRoles = ['host', 'speaker', 'listener'];
        if (!validRoles.includes(newRole)) throw new Error("Invalid role");

        participant.role = newRole;
        return await participantRepository.save(participant);
    }

    static async endRoom(hostId: string, roomId: string) {
        const room = await roomRepository.findOne({
            where: { id: roomId },
            relations: ["host"]
        });

        if (!room) throw new Error("Room not found");
        if (room.host.id !== hostId) throw new Error("Only host can end room");

        room.status = 'ended';
        room.ended_at = new Date();

        return await roomRepository.save(room);
    }
}
