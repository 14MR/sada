import { AppDataSource } from "../config/database";
import { SpeakerRequest } from "../models/SpeakerRequest";
import { Room } from "../models/Room";
import { RoomHostRequiredError, RoomNotFoundError, RoomService } from "./room.service";

const requestRepository = AppDataSource.getRepository(SpeakerRequest);

export class SpeakerRequestAlreadyExistsError extends Error {
    constructor() {
        super("Already requested");
        this.name = "SpeakerRequestAlreadyExistsError";
    }
}

export class SpeakerRequestNotFoundError extends Error {
    constructor() {
        super("Request not found");
        this.name = "SpeakerRequestNotFoundError";
    }
}

export class SpeakerRequestAlreadyResolvedError extends Error {
    constructor() {
        super("Request already resolved");
        this.name = "SpeakerRequestAlreadyResolvedError";
    }
}

export class PendingSpeakerRequestNotFoundError extends Error {
    constructor() {
        super("No pending request found");
        this.name = "PendingSpeakerRequestNotFoundError";
    }
}

export class SpeakerRequestService {
    /** Raise hand — create a pending request */
    static async raiseHand(roomId: string, userId: string, message?: string) {
        // Check if already requested
        const existing = await requestRepository.findOne({
            where: { room_id: roomId, user_id: userId, status: "pending" },
        });
        if (existing) throw new SpeakerRequestAlreadyExistsError();

        const request = requestRepository.create({
            room_id: roomId,
            user_id: userId,
            message: message || null,
            status: "pending",
        });

        return await requestRepository.save(request);
    }

    /** Get pending requests for a room (host sees queue) */
    static async getPending(roomId: string) {
        return await requestRepository.find({
            where: { room_id: roomId, status: "pending" },
            relations: ["user"],
            order: { created_at: "ASC" },
        });
    }

    /** Host approves — changes role to speaker */
    static async approve(roomId: string, requestId: string, hostId: string) {
        const request = await requestRepository.findOne({
            where: { id: requestId, room_id: roomId },
        });
        if (!request) throw new SpeakerRequestNotFoundError();
        if (request.status !== "pending") throw new SpeakerRequestAlreadyResolvedError();

        request.status = "approved";
        request.resolved_at = new Date();
        request.resolved_by = hostId;

        await requestRepository.save(request);

        // Update participant role to speaker
        await RoomService.updateParticipantRole(hostId, roomId, request.user_id, "speaker");

        return request;
    }

    /** Host rejects */
    static async reject(roomId: string, requestId: string, hostId: string) {
        // Verify the rejecting user is the room host
        const roomRepository = AppDataSource.getRepository(Room);
        const room = await roomRepository.findOne({ where: { id: roomId } });
        if (!room) throw new RoomNotFoundError();
        if (room.host_id !== hostId) throw new RoomHostRequiredError("Only the host can reject speaker requests");

        const request = await requestRepository.findOne({
            where: { id: requestId, room_id: roomId },
        });
        if (!request) throw new SpeakerRequestNotFoundError();
        if (request.status !== "pending") throw new SpeakerRequestAlreadyResolvedError();

        request.status = "rejected";
        request.resolved_at = new Date();
        request.resolved_by = hostId;

        return await requestRepository.save(request);
    }

    /** User cancels their own request */
    static async cancel(roomId: string, userId: string) {
        const request = await requestRepository.findOne({
            where: { room_id: roomId, user_id: userId, status: "pending" },
        });
        if (!request) throw new PendingSpeakerRequestNotFoundError();

        request.status = "cancelled";
        return await requestRepository.save(request);
    }
}
