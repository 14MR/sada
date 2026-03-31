import { AppDataSource } from "../config/database";
import { Room } from "../models/Room";
import { RoomParticipant } from "../models/RoomParticipant";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { RoomRecording, RecordingStatus } from "../models/RoomRecording";
import { AudioService } from "./audio.service";
import { NotificationService } from "./notification.service";
import { NotificationType } from "../models/Notification";
import { Follow } from "../models/Follow";
import { BlockService } from "./block.service";
import { ActivityService } from "./activity.service";
import { ActivityType } from "../models/UserActivity";
import logger from "../config/logger";

const roomRepository = AppDataSource.getRepository(Room);
const participantRepository = AppDataSource.getRepository(RoomParticipant);
const categoryRepository = AppDataSource.getRepository(Category);
const recordingRepository = AppDataSource.getRepository(RoomRecording);

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

        // Record activity (fire-and-forget)
        ActivityService.record(host.id, ActivityType.ROOM_CREATED, { roomId: savedRoom.id, title }).catch(() => {});

        // Notify host's followers that a room started (fire-and-forget)
        const followRepository = AppDataSource.getRepository(Follow);
        followRepository.find({
            where: { following: { id: host.id } },
            relations: ["follower"],
        }).then((followers) => {
            Promise.all(followers.map((follow) =>
                NotificationService.create(
                    follow.follower.id,
                    NotificationType.ROOM_STARTED,
                    `${host.username || "Someone"} started a room: ${title}`,
                    undefined,
                    { roomId: savedRoom.id, hostId: host.id }
                ).catch((e) => logger.warn({ err: e }, "Failed to notify follower"))
            ));
        }).catch((e) => logger.warn({ err: e }, "Failed to fetch followers for notification"));

        // Return room + audio details (simple merge for MVP response)
        return { ...savedRoom, audio: audioSession };
    }

    static async getLiveRooms(categorySlug?: string, status?: string, limit: number = 50, offset: number = 0) {
        const query = roomRepository.createQueryBuilder("room")
            .leftJoinAndSelect("room.host", "host")
            .leftJoinAndSelect("room.category", "category")
            .where("room.status = :status", { status: status || 'live' })
            .orderBy("room.started_at", "DESC")
            .skip(offset)
            .take(limit);

        if (categorySlug) {
            query.andWhere("category.slug = :slug", { slug: categorySlug });
        }

        return await query.getMany();
    }

    static async searchRooms(q: string) {
        return await roomRepository.createQueryBuilder("room")
            .leftJoinAndSelect("room.host", "host")
            .leftJoinAndSelect("room.category", "category")
            .where("(room.title ILIKE :q OR room.description ILIKE :q)", { q: `%${q}%` })
            .orderBy("room.started_at", "DESC")
            .getMany();
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

        // Block enforcement: check if the joining user is blocked by the host (or vice versa)
        const isBlocked = await BlockService.isBlocked(user.id, room.host_id);
        if (isBlocked) throw new Error("Cannot join this room");

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

        // Record activity (fire-and-forget)
        ActivityService.record(user.id, ActivityType.ROOM_JOINED, { roomId }).catch(() => {});

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

    // ── Scheduled Rooms ──────────────────────────────────────────────

    static async scheduleRoom(host: User, title: string, description: string, categoryId: string, scheduledAt: Date) {
        const category = await categoryRepository.findOneBy({ id: categoryId });
        if (!category) throw new Error("Category not found");
        if (scheduledAt.getTime() <= Date.now()) throw new Error("scheduledAt must be a future date");

        const room = new Room();
        room.host = host;
        room.title = title;
        room.description = description;
        room.categoryId = categoryId;
        room.scheduledAt = scheduledAt;
        room.status = 'scheduled';
        room.listener_count = 0;

        const savedRoom = await roomRepository.save(room);

        // Notify host's followers about the scheduled room
        const followRepository = AppDataSource.getRepository(Follow);
        followRepository.find({
            where: { following: { id: host.id } },
            relations: ["follower"],
        }).then((followers) => {
            Promise.all(followers.map((follow) =>
                NotificationService.create(
                    follow.follower.id,
                    NotificationType.ROOM_SCHEDULED,
                    `${host.username || "Someone"} scheduled a room: ${title}`,
                    `Scheduled for ${scheduledAt.toISOString()}`,
                    { roomId: savedRoom.id, hostId: host.id, scheduledAt: scheduledAt.toISOString() }
                ).catch((e) => logger.warn({ err: e }, "Failed to notify follower"))
            ));
        }).catch((e) => logger.warn({ err: e }, "Failed to fetch followers for notification"));

        return savedRoom;
    }

    static async getScheduledRooms(limit: number = 20, offset: number = 0, categorySlug?: string) {
        let category: Category | null = null;
        if (categorySlug) {
            category = await categoryRepository.findOneBy({ slug: categorySlug });
        }

        const where: any = {
            status: 'scheduled',
        };
        if (category) {
            where.categoryId = category.id;
        }

        const [rooms, total] = await roomRepository.findAndCount({
            where,
            relations: ["host", "category"],
            order: { scheduledAt: "ASC" },
            skip: offset,
            take: limit,
        });

        return { rooms, total, limit, offset };
    }

    static async startScheduledRoom(hostId: string, roomId: string) {
        const room = await roomRepository.findOne({
            where: { id: roomId },
            relations: ["host"]
        });

        if (!room) throw new Error("Room not found");
        if (room.host.id !== hostId) throw new Error("Only the host can start this room");
        if (room.status !== 'scheduled') throw new Error("Room is not in scheduled status");

        room.status = 'live';

        const savedRoom = await roomRepository.save(room);

        // Provision Audio Session
        const audioSession = await AudioService.createSession(savedRoom.id, hostId);

        // Add host as participant
        const participant = new RoomParticipant();
        participant.room = savedRoom;
        participant.user = room.host;
        participant.role = 'host';
        await participantRepository.save(participant);

        // Notify host's followers that the room is now live
        const followRepository = AppDataSource.getRepository(Follow);
        followRepository.find({
            where: { following: { id: hostId } },
            relations: ["follower"],
        }).then((followers) => {
            Promise.all(followers.map((follow) =>
                NotificationService.create(
                    follow.follower.id,
                    NotificationType.ROOM_STARTED,
                    `${room.host.username || "Someone"} started a room: ${room.title}`,
                    undefined,
                    { roomId: savedRoom.id, hostId }
                ).catch((e) => logger.warn({ err: e }, "Failed to notify follower"))
            ));
        }).catch((e) => logger.warn({ err: e }, "Failed to fetch followers for notification"));

        return { ...savedRoom, audio: audioSession };
    }

    // ── Trending / Discovery ─────────────────────────────────────────

    static async getTrendingRooms(limit: number = 20, offset: number = 0) {
        // Fetch live rooms with participants for trending calculation
        const rooms = await roomRepository.createQueryBuilder("room")
            .leftJoinAndSelect("room.host", "host")
            .leftJoinAndSelect("room.category", "category")
            .leftJoinAndSelect("room.participants", "participant")
            .where("room.status = :status", { status: 'live' })
            .getMany();

        // Compute trending score in JS for cross-DB compatibility:
        // score = listener_count * recency_boost + participant_count
        // recency_boost = 1000 / (hours_since_start + 1)
        const scored = rooms.map((room) => {
            const hoursSinceStart = (Date.now() - new Date(room.started_at).getTime()) / (1000 * 3600);
            const recencyBoost = 1000 / (hoursSinceStart + 1);
            const participantCount = room.participants?.length ?? 0;
            const score = room.listener_count * recencyBoost + participantCount;
            return { room, score };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.slice(offset, offset + limit).map((s) => {
            // Remove participants array from response to keep it clean
            const { participants, ...rest } = s.room as any;
            return rest;
        });
    }

    static async getRoomsByCategory(slug: string, limit: number = 20, offset: number = 0) {
        const category = await categoryRepository.findOneBy({ slug });
        if (!category) {
            return { rooms: [], total: 0, limit, offset };
        }

        const [rooms, total] = await roomRepository.findAndCount({
            where: { status: 'live', categoryId: category.id },
            relations: ["host", "category"],
            order: { listener_count: "DESC", started_at: "DESC" },
            skip: offset,
            take: limit,
        });

        return { rooms, total, limit, offset };
    }

    // ── Room Recordings & Replay ────────────────────────────────────

    static async getRoomRecordings(roomId: string) {
        const room = await roomRepository.findOneBy({ id: roomId });
        if (!room) throw new Error("Room not found");

        return await recordingRepository.find({
            where: { room_id: roomId, status: RecordingStatus.PUBLISHED },
            relations: ["host"],
            order: { started_at: "DESC" },
        });
    }

    static async getRoomReplay(roomId: string) {
        const room = await roomRepository.findOne({
            where: { id: roomId },
            relations: ["host", "category"],
        });
        if (!room) throw new Error("Room not found");
        if (room.status !== "ended") throw new Error("Replay is only available for ended rooms");

        const [recordings, participants] = await Promise.all([
            recordingRepository.find({
                where: { room_id: roomId, status: RecordingStatus.PUBLISHED },
                relations: ["host"],
                order: { started_at: "ASC" },
            }),
            participantRepository.find({
                where: { room: { id: roomId } },
                relations: ["user"],
            }),
        ]);

        return {
            room: {
                id: room.id,
                title: room.title,
                description: room.description,
                host: room.host,
                category: room.category,
                listener_count: room.listener_count,
                started_at: room.started_at,
                ended_at: room.ended_at,
            },
            recordings,
            participants: participants.map((p) => ({
                user: p.user,
                role: p.role,
                joined_at: p.joined_at,
            })),
        };
    }
}
