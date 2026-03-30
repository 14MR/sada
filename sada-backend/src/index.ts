import "reflect-metadata";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { AppDataSource } from "./config/database";
import { vars } from "./config/env";
import logger from "./config/logger";
import { authenticate } from "./middleware/auth";
import { requestLogger } from "./middleware/requestLogger";
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

// Request logging
app.use(requestLogger);

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

// Enhanced health check
app.get("/", async (req, res) => {
    const mem = process.memoryUsage();
    const health: Record<string, any> = {
        status: "ok",
        version: process.env.npm_package_version || "1.0.0",
        uptime: process.uptime(),
        memory: {
            rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
        },
    };

    try {
        if (AppDataSource.isInitialized) {
            await AppDataSource.query("SELECT 1");
            health.database = "connected";
        } else {
            health.database = "not initialized";
            health.status = "degraded";
        }
    } catch {
        health.database = "error";
        health.status = "unhealthy";
        return res.status(503).json(health);
    }

    const code = health.status === "ok" ? 200 : 503;
    res.status(code).json(health);
});

// Initialize Database and Start Server
AppDataSource.initialize()
    .then(() => {
        logger.info("Data Source has been initialized");

        // Initialize Chat Service (Socket.io)
        ChatService.initialize(httpServer);

        httpServer.listen(port, () => {
            logger.info({ port }, "Server started");
        });
    })
    .catch((err) => {
        logger.fatal(err, "Error during Data Source initialization");
    });
