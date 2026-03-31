import { AppDataSource } from "../config/database";
import { RoomInvite } from "../models/RoomInvite";
import { Room } from "../models/Room";
import { RoomParticipant } from "../models/RoomParticipant";
import { User } from "../models/User";
import { BlockService } from "./block.service";
import { AudioService } from "./audio.service";
import { ActivityService } from "./activity.service";
import { ActivityType } from "../models/UserActivity";
import { randomBytes } from "crypto";

const inviteRepository = AppDataSource.getRepository(RoomInvite);
const roomRepository = AppDataSource.getRepository(Room);
const participantRepository = AppDataSource.getRepository(RoomParticipant);

export class InviteService {
    static async createDirectInvite(inviterId: string, roomId: string, inviteeId: string): Promise<RoomInvite> {
        const room = await roomRepository.findOneBy({ id: roomId });
        if (!room) throw new Error("Room not found");
        if (room.status !== 'live') throw new Error("Room is not live");
        if (room.host_id !== inviterId) throw new Error("Only the host can invite");

        if (inviterId === inviteeId) throw new Error("Cannot invite yourself");

        const invite = new RoomInvite();
        invite.roomId = roomId;
        invite.inviterId = inviterId;
        invite.inviteeId = inviteeId;
        invite.type = 'direct';

        return await inviteRepository.save(invite);
    }

    static async createLinkInvite(inviterId: string, roomId: string, maxUses?: number, expiresAt?: Date): Promise<RoomInvite> {
        const room = await roomRepository.findOneBy({ id: roomId });
        if (!room) throw new Error("Room not found");
        if (room.status !== 'live' && room.status !== 'scheduled') throw new Error("Room is not active");
        if (room.host_id !== inviterId) throw new Error("Only the host can create invite links");

        const code = randomBytes(6).toString("hex");

        const invite = new RoomInvite();
        invite.roomId = roomId;
        invite.inviterId = inviterId;
        invite.inviteCode = code;
        invite.type = 'link';
        invite.maxUses = maxUses || null;
        invite.expiresAt = expiresAt || null;

        return await inviteRepository.save(invite);
    }

    static async acceptInvite(userId: string, code: string): Promise<{ participant: RoomParticipant; audio: any }> {
        const invite = await inviteRepository.findOne({
            where: { inviteCode: code },
            relations: ["room"],
        });

        if (!invite) throw new Error("Invite not found");
        if (invite.type !== 'link') throw new Error("Invalid invite code");

        if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
            throw new Error("Invite has expired");
        }

        if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
            throw new Error("Invite has reached maximum uses");
        }

        const room = invite.room;
        if (room.status !== 'live') throw new Error("Room is not live");

        // Block check
        const isBlocked = await BlockService.isBlocked(userId, room.host_id);
        if (isBlocked) throw new Error("Cannot join this room");

        // Increment uses
        invite.uses += 1;
        await inviteRepository.save(invite);

        // Add as participant
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");

        let participant = await participantRepository.findOne({
            where: { room: { id: room.id }, user: { id: userId } },
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

        const audioConnection = await AudioService.generateToken(room.id, userId, participant.role);

        // Record activity
        ActivityService.record(userId, ActivityType.ROOM_JOINED, { roomId: room.id }).catch(() => {});

        return { participant, audio: audioConnection };
    }

    static async acceptDirectInvite(userId: string, inviteId: string): Promise<{ participant: RoomParticipant; audio: any }> {
        const invite = await inviteRepository.findOne({
            where: { id: inviteId, inviteeId: userId, type: 'direct' },
            relations: ["room"],
        });

        if (!invite) throw new Error("Invite not found");

        if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
            throw new Error("Invite has expired");
        }

        const room = invite.room;
        if (room.status !== 'live') throw new Error("Room is not live");

        // Block check
        const isBlocked = await BlockService.isBlocked(userId, room.host_id);
        if (isBlocked) throw new Error("Cannot join this room");

        // Mark as used
        invite.uses += 1;
        await inviteRepository.save(invite);

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOneBy({ id: userId });
        if (!user) throw new Error("User not found");

        let participant = await participantRepository.findOne({
            where: { room: { id: room.id }, user: { id: userId } },
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

        const audioConnection = await AudioService.generateToken(room.id, userId, participant.role);

        ActivityService.record(userId, ActivityType.ROOM_JOINED, { roomId: room.id }).catch(() => {});

        return { participant, audio: audioConnection };
    }

    static async listInvites(roomId: string, requesterId: string): Promise<RoomInvite[]> {
        const room = await roomRepository.findOneBy({ id: roomId });
        if (!room) throw new Error("Room not found");
        if (room.host_id !== requesterId) throw new Error("Only the host can list invites");

        return await inviteRepository.find({
            where: { roomId },
            relations: ["inviter", "invitee"],
            order: { createdAt: "DESC" },
        });
    }
}
