import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";

export class ChatService {
    private static instance: ChatService;
    private io: Server;

    private constructor(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: "*",
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
        // Emit to room "user_{userId}"
        this.io.to(`user_${userId}`).emit(event, data);
    }

    private initializeConnection() {
        this.io.on("connection", (socket: Socket) => {
            console.log(`✅ User connected: ${socket.id}`);
            
            // Listen for user identity to join their notification channel
            socket.on("identify", (userId: string) => {
                socket.join(`user_${userId}`);
                console.log(`👤 User ${userId} joined notification channel: user_${userId}`);
            });
            
            socket.on("join_room", (roomId: string) => {
                socket.join(roomId);
                console.log(`🏠 User ${socket.id} joined room ${roomId}`);
                console.log(`👥 Room ${roomId} members:`, this.io.sockets.adapter.rooms?.get(roomId)?.size || 'unknown');
                // Send a welcome message to confirm the room is working
                this.io.to(roomId).emit("receive_message", {
                    username: 'System',
                    message: `Welcome to room ${roomId}!`,
                    userId: 'system'
                });
                socket.to(roomId).emit("user_joined", { socketId: socket.id });
            });
            
            socket.on("send_message", (data: { roomId: string, message: string, userId: string, username: string }) => {
                console.log(`📤 Received message to broadcast:`, data);
                console.log(`📡 Broadcasting to room: ${data.roomId}`);
                this.io.to(data.roomId).emit("receive_message", data);
                console.log(`✅ Message broadcasted to room ${data.roomId}`);
            });
            
            socket.on("signal", (data: { roomId: string, signal: any }) => {
                // Relay WebRTC signaling data to everyone else in the room
                socket.to(data.roomId).emit("signal", {
                    senderId: socket.id,
                    signal: data.signal
                });
            });
            
            socket.on("leave_room", (roomId: string) => {
                socket.leave(roomId);
                console.log(`🚪 User ${socket.id} left room ${roomId}`);
            });
            
            socket.on("disconnect", () => {
                console.log(`👋 User disconnected: ${socket.id}`);
            });
        });
    }
}
