import "reflect-metadata";
import { createServer } from "http";
import { AppDataSource } from "./config/database";
import { vars } from "./config/env";
import logger from "./config/logger";
import { createApp } from "./app";
import { ChatService } from "./services/chat.service";

const app = createApp();
const httpServer = createServer(app);
const port = vars.port;

// Basic health check (before DB init)
app.get("/", (req, res) => {
    res.send("SADA Backend is running 🚀");
});

// Initialize Database and Start Server
AppDataSource.initialize()
    .then(() => {
        logger.info("Data Source has been initialized!");

        // Initialize Chat Service (Socket.io)
        ChatService.initialize(httpServer);

        httpServer.listen(port, () => {
            logger.info(`Server started on port ${port}`);
        });
    })
    .catch((err) => {
        logger.error("Error during Data Source initialization", err);
    });
