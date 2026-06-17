import { AppDataSource } from "../config/database";
import { RoomClip } from "../models/RoomClip";
import { Room } from "../models/Room";

const clipRepository = AppDataSource.getRepository(RoomClip);
const roomRepository = AppDataSource.getRepository(Room);

export class ClipRoomNotFoundError extends Error {
    constructor() {
        super("Room not found");
        this.name = "ClipRoomNotFoundError";
    }
}

export class InvalidClipRangeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidClipRangeError";
    }
}

export class ClipService {
    static async createClip(creatorId: string, roomId: string, startTime: number, endTime: number, title: string): Promise<RoomClip> {
        const room = await roomRepository.findOneBy({ id: roomId });
        if (!room) throw new ClipRoomNotFoundError();

        if (endTime <= startTime) throw new InvalidClipRangeError("End time must be after start time");
        if (startTime < 0) throw new InvalidClipRangeError("Start time must be non-negative");

        const clip = new RoomClip();
        clip.roomId = roomId;
        clip.creatorId = creatorId;
        clip.startTime = startTime;
        clip.endTime = endTime;
        clip.title = title;

        return await clipRepository.save(clip);
    }

    static async listClips(roomId: string, limit: number = 20, offset: number = 0): Promise<{ clips: RoomClip[]; total: number }> {
        const [clips, total] = await clipRepository.findAndCount({
            where: { roomId },
            relations: ["creator"],
            order: { createdAt: "DESC" },
            skip: offset,
            take: limit,
        });

        return { clips, total };
    }

    static async getClip(clipId: string): Promise<RoomClip | null> {
        return await clipRepository.findOne({
            where: { id: clipId },
            relations: ["creator", "room"],
        });
    }
}
