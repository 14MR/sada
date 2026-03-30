import { Request, Response } from "express";
import { RecordingService } from "../services/recording.service";
import logger from "../config/logger";

export class RecordingController {
    static async start(req: Request, res: Response) {
        try {
            const { roomId } = req.body;
            const hostId = (req as any).user.id;

            if (!roomId) return res.status(400).json({ error: "roomId is required" });

            const recording = await RecordingService.startRecording(roomId, hostId);
            return res.status(201).json(recording);
        } catch (error: any) {
            logger.error({ err: error }, "Start Recording Error");
            return res.status(400).json({ error: error.message });
        }
    }

    static async stop(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const hostId = (req as any).user.id;
            const { roomId } = req.body;

            if (!roomId) return res.status(400).json({ error: "roomId is required" });

            const recording = await RecordingService.stopRecording(roomId, hostId);
            return res.json(recording);
        } catch (error: any) {
            logger.error({ err: error }, "Stop Recording Error");
            return res.status(400).json({ error: error.message });
        }
    }

    static async publish(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const hostId = (req as any).user.id;

            const recording = await RecordingService.publishRecording(id, hostId);
            return res.json(recording);
        } catch (error: any) {
            logger.error({ err: error }, "Publish Recording Error");
            return res.status(400).json({ error: error.message });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const recordings = await RecordingService.getRecordings(limit, offset);
            return res.json(recordings);
        } catch (error) {
            logger.error({ err: error }, "List Recordings Error");
            return res.status(500).json({ error: "Failed to list recordings" });
        }
    }

    static async get(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const recording = await RecordingService.getRecording(id);
            return res.json(recording);
        } catch (error: any) {
            if (error.message === "Recording not found") {
                return res.status(404).json({ error: error.message });
            }
            logger.error({ err: error }, "Get Recording Error");
            return res.status(500).json({ error: "Failed to get recording" });
        }
    }

    static async mine(req: Request, res: Response) {
        try {
            const hostId = (req as any).user.id;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = parseInt(req.query.offset as string) || 0;

            const recordings = await RecordingService.getHostRecordings(hostId, limit, offset);
            return res.json(recordings);
        } catch (error) {
            logger.error({ err: error }, "My Recordings Error");
            return res.status(500).json({ error: "Failed to get recordings" });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            const hostId = (req as any).user.id;

            await RecordingService.deleteRecording(id, hostId);
            return res.json({ success: true });
        } catch (error: any) {
            if (error.message === "Recording not found") {
                return res.status(404).json({ error: error.message });
            }
            logger.error({ err: error }, "Delete Recording Error");
            return res.status(400).json({ error: error.message });
        }
    }
}
