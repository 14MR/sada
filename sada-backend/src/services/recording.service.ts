import { AppDataSource } from "../config/database";
import { RoomRecording, RecordingStatus } from "../models/RoomRecording";
import { Room } from "../models/Room";

const recordingRepository = AppDataSource.getRepository(RoomRecording);
const roomRepository = AppDataSource.getRepository(Room);

export class RecordingService {
    static async startRecording(roomId: string, hostId: string) {
        const room = await roomRepository.findOne({
            where: { id: roomId },
            relations: ["host"],
        });

        if (!room) throw new Error("Room not found");
        if (room.host.id !== hostId) throw new Error("Only the host can start recording");
        if (room.status !== "live") throw new Error("Room is not live");

        // Check if there's already an active recording for this room
        const existing = await recordingRepository.findOne({
            where: { room_id: roomId, status: RecordingStatus.RECORDING },
        });
        if (existing) throw new Error("Room is already being recorded");

        const recording = new RoomRecording();
        recording.room_id = roomId;
        recording.host_id = hostId;
        recording.title = room.title;
        recording.description = room.description;
        recording.status = RecordingStatus.RECORDING;
        recording.started_at = new Date();
        recording.listener_count = room.listener_count;
        recording.participant_count = 0;

        return await recordingRepository.save(recording);
    }

    static async stopRecording(roomId: string, hostId: string) {
        const recording = await recordingRepository.findOne({
            where: { room_id: roomId, status: RecordingStatus.RECORDING },
        });

        if (!recording) throw new Error("No active recording found for this room");
        if (recording.host_id !== hostId) throw new Error("Only the host can stop recording");

        const now = new Date();
        recording.stopped_at = now;
        recording.duration_seconds = Math.round((now.getTime() - recording.started_at.getTime()) / 1000);
        recording.status = RecordingStatus.STOPPED;

        return await recordingRepository.save(recording);
    }

    static async publishRecording(recordingId: string, hostId: string) {
        const recording = await recordingRepository.findOne({
            where: { id: recordingId },
        });

        if (!recording) throw new Error("Recording not found");
        if (recording.host_id !== hostId) throw new Error("Only the host can publish recording");
        if (recording.status !== RecordingStatus.STOPPED) throw new Error("Recording must be stopped before publishing");

        recording.status = RecordingStatus.PUBLISHED;
        return await recordingRepository.save(recording);
    }

    static async getRecordings(limit: number = 20, offset: number = 0) {
        return await recordingRepository.find({
            where: { status: RecordingStatus.PUBLISHED },
            relations: ["host"],
            order: { started_at: "DESC" },
            skip: offset,
            take: limit,
        });
    }

    static async getRecording(id: string) {
        const recording = await recordingRepository.findOne({
            where: { id },
            relations: ["host", "room"],
        });

        if (!recording) throw new Error("Recording not found");

        // Increment play count
        recording.play_count += 1;
        await recordingRepository.save(recording);

        return recording;
    }

    static async getHostRecordings(hostId: string, limit: number = 20, offset: number = 0) {
        return await recordingRepository.find({
            where: { host_id: hostId },
            relations: ["room"],
            order: { started_at: "DESC" },
            skip: offset,
            take: limit,
        });
    }

    static async deleteRecording(recordingId: string, hostId: string) {
        const recording = await recordingRepository.findOne({
            where: { id: recordingId },
        });

        if (!recording) throw new Error("Recording not found");
        if (recording.host_id !== hostId) throw new Error("Only the host can delete recording");

        recording.status = RecordingStatus.FAILED;
        return await recordingRepository.save(recording);
    }
}
