import { AppDataSource } from "../config/database";
import { SpeakerRequest } from "../models/SpeakerRequest";

const requestRepository = AppDataSource.getRepository(SpeakerRequest);

export class SpeakerRequestService {
    /** Raise hand — create a pending request */
    static async raiseHand(roomId: string, userId: string, message?: string) {
        // Check if already requested
        const existing = await requestRepository.findOne({
            where: { room_id: roomId, user_id: userId, status: "pending" },
        });
        if (existing) throw new Error("Already requested");

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
        if (!request) throw new Error("Request not found");
        if (request.status !== "pending") throw new Error("Request already resolved");

        request.status = "approved";
        request.resolved_at = new Date();
        request.resolved_by = hostId;

        await requestRepository.save(request);

        // Update participant role to speaker
        const { RoomService } = require("./room.service");
        await RoomService.updateParticipantRole(hostId, roomId, request.user_id, "speaker");

        return request;
    }

    /** Host rejects */
    static async reject(roomId: string, requestId: string, hostId: string) {
        const request = await requestRepository.findOne({
            where: { id: requestId, room_id: roomId },
        });
        if (!request) throw new Error("Request not found");
        if (request.status !== "pending") throw new Error("Request already resolved");

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
        if (!request) throw new Error("No pending request found");

        request.status = "cancelled";
        return await requestRepository.save(request);
    }
}
