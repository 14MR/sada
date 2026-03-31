import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../middleware/auth";

function getCorsOrigins(): string | string[] {
    const origins = process.env.CORS_ORIGINS;
    if (!origins || origins === "*") return "*";
    return origins.split(",").map(o => o.trim());
}

export class ChatService {
    private static instance: ChatService;
    private io: Server;

    private constructor(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: getCorsOrigins(),
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
            socket.on("join_room", (roomId: string) => {
                socket.join(roomId);
                socket.to(roomId).emit("user_joined", { socketId: socket.id });
            });
            socket.on("send_message", (data: { roomId: string, message: string }) => {
                const user = (socket as any).user;
                // Use authenticated identity — never trust client-provided userId/username
                this.io.to(data.roomId).emit("receive_message", {
                    roomId: data.roomId,
                    message: data.message,
                    userId: user?.id,
                    username: user?.username,
                });
            });
            socket.on("signal", (data: { roomId: string, signal: any }) => {
                socket.to(data.roomId).emit("signal", { senderId: socket.id, signal: data.signal });
            });
            socket.on("leave_room", (roomId: string) => { socket.leave(roomId); });
            socket.on("disconnect", () => {});
        });
    }
}
