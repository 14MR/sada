import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../middleware/auth";
import { AppDataSource } from "../config/database";
import { getSocketCorsOrigin } from "../config/cors";
import { RoomParticipant } from "../models/RoomParticipant";
import { IsNull } from "typeorm";

export class ChatService {
    private static instance: ChatService;
    private io: Server;

    private constructor(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: getSocketCorsOrigin(),
                methods: ["GET", "POST"]
            }
        });

        this.initializeConnection();
    }

    public static initialize(httpServer: HttpServer): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService(httpServer);
        }
        return ChatService.instance;
    }

    public static getInstance(): ChatService {
        if (!ChatService.instance) {
            throw new Error("ChatService not initialized");
        }
        return ChatService.instance;
    }

    public sendToUser(userId: string, event: string, data: any) {
        this.io.to(`user_${userId}`).emit(event, data);
    }

    public emitToRoom(roomId: string, event: string, data: any) {
        this.io.to(roomId).emit(event, data);
    }

    public static async canAccessRoom(userId: string, roomId: string): Promise<boolean> {
        const participant = await AppDataSource.getRepository(RoomParticipant).findOne({
            where: {
                user_id: userId,
                room_id: roomId,
                left_at: IsNull(),
            },
            relations: ["room"],
        });

        return Boolean(
            participant &&
            participant.room?.status === "live" &&
            participant.room.chat_enabled
        );
    }

    private initializeConnection() {
        this.io.use((socket: Socket, next) => {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token as string;
            if (!token) {
                return next(new Error("Authentication required"));
            }
            try {
                const payload = jwt.verify(token, getJwtSecret()) as { id: string; username: string };
                (socket as any).user = payload;
                next();
            } catch {
                return next(new Error("Invalid or expired token"));
            }
        });

        this.io.on("connection", (socket: Socket) => {
            socket.on("identify", () => {
                const user = (socket as any).user;
                if (user?.id) {
                    socket.join(`user_${user.id}`);
                }
            });
            socket.on("join_room", async (roomId: string) => {
                const user = (socket as any).user;
                if (!user?.id || typeof roomId !== "string") {
                    socket.emit("room_error", { roomId, error: "Room access denied" });
                    return;
                }

                const canAccess = await ChatService.canAccessRoom(user.id, roomId);
                if (!canAccess) {
                    socket.emit("room_error", { roomId, error: "Room access denied" });
                    return;
                }

                socket.join(roomId);
                socket.to(roomId).emit("user_joined", { socketId: socket.id });
            });
            socket.on("send_message", (data: { roomId: string, message: string }) => {
                const user = (socket as any).user;
                if (!data?.roomId || !socket.rooms.has(data.roomId)) {
                    socket.emit("room_error", { roomId: data?.roomId, error: "Join room before sending messages" });
                    return;
                }

                // Use authenticated identity — never trust client-provided userId/username
                this.io.to(data.roomId).emit("receive_message", {
                    roomId: data.roomId,
                    message: data.message,
                    userId: user?.id,
                    username: user?.username,
                });
            });
            socket.on("signal", (data: { roomId: string, signal: any }) => {
                if (!data?.roomId || !socket.rooms.has(data.roomId)) {
                    socket.emit("room_error", { roomId: data?.roomId, error: "Join room before signaling" });
                    return;
                }

                socket.to(data.roomId).emit("signal", { senderId: socket.id, signal: data.signal });
            });
            socket.on("leave_room", (roomId: string) => { socket.leave(roomId); });
            socket.on("disconnect", () => {});
        });
    }
}
