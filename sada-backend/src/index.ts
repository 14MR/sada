import "reflect-metadata";
import express from "express";
import { createServer } from "http";
import { AppDataSource } from "./config/database";
import { vars } from "./config/env";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import roomRoutes from "./routes/rooms.routes";
import followRoutes from "./routes/follow.routes";
import gemRoutes from "./routes/gem.routes";
import { ChatService } from "./services/chat.service";

const app = express();
const httpServer = createServer(app); // Create HTTP server for Socket.io
const port = vars.port;

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users", followRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/gems", gemRoutes);

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
