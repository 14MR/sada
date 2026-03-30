import "reflect-metadata";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { AppDataSource } from "./config/database";
import { vars } from "./config/env";
import { authenticate } from "./middleware/auth";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import roomRoutes from "./routes/rooms.routes";
import followRoutes from "./routes/follow.routes";
import gemRoutes from "./routes/gem.routes";
import categoryRoutes from "./routes/category.routes";
import creatorRoutes from "./routes/creator.routes";
import moderationRoutes from "./routes/moderation.routes";
import adminRoutes from "./routes/admin.routes";
import notificationRoutes from "./routes/notification.routes";
import withdrawalRoutes from "./routes/withdrawal.routes";
import recordingRoutes from "./routes/recording.routes";
import reactionRoutes from "./routes/reaction.routes";
import { ChatService } from "./services/chat.service";

const app = express();
const httpServer = createServer(app);
const port = vars.port;

// CORS
const corsOrigins = process.env.CORS_ORIGINS;
app.use(cors({
    origin: !corsOrigins || corsOrigins === "*" ? undefined : corsOrigins.split(",").map(o => o.trim()),
}));

app.use(express.json());

// Auth middleware (skips / and /api/auth/signin)
app.use(authenticate);

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: "Too many auth attempts, please try again later" },
});
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again later" },
});

app.use("/api/auth", authLimiter);
app.use(apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users", followRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/gems", gemRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/recordings", recordingRoutes);
app.use("/api/reactions", reactionRoutes);

// Basic health check
app.get("/", (req, res) => {
    res.send("SADA Backend is running 🚀");
});

// Initialize Database and Start Server
AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!");

        // Initialize Chat Service (Socket.io)
        ChatService.initialize(httpServer);

        httpServer.listen(port, () => {
            console.log(`Server started on port ${port}`);
        });
    })
    .catch((err) => {
        console.error("Error during Data Source initialization", err);
    });
