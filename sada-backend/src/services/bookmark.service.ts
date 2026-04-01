import { AppDataSource } from "../config/database";
import { RoomBookmark } from "../models/RoomBookmark";
import { Room } from "../models/Room";

const bookmarkRepository = AppDataSource.getRepository(RoomBookmark);
const roomRepository = AppDataSource.getRepository(Room);

export class BookmarkService {
    static async bookmark(userId: string, roomId: string) {
        const room = await roomRepository.findOneBy({ id: roomId });
        if (!room) throw new Error("Room not found");

        const existing = await bookmarkRepository.findOne({
            where: { user_id: userId, room_id: roomId },
        });
        if (existing) throw new Error("Room already bookmarked");

        const bm = new RoomBookmark();
        bm.user_id = userId;
        bm.room_id = roomId;
        return await bookmarkRepository.save(bm);
    }

    static async removeBookmark(userId: string, roomId: string) {
        const bm = await bookmarkRepository.findOne({
            where: { user_id: userId, room_id: roomId },
        });
        if (!bm) throw new Error("Bookmark not found");
        await bookmarkRepository.remove(bm);
    }

    static async getUserBookmarks(userId: string, limit: number = 20, offset: number = 0) {
        const [bookmarks, total] = await bookmarkRepository.findAndCount({
            where: { user_id: userId },
            relations: ["room", "room.host", "room.category"],
            order: { created_at: "DESC" },
            skip: offset,
            take: limit,
        });

        return {
            bookmarks: bookmarks.map(b => b.room),
            total,
            limit,
            offset,
        };
    }
}
