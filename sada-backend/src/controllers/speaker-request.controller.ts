import { Request, Response } from "express";
import { SpeakerRequestService } from "../services/speaker-request.service";

export class SpeakerRequestController {
    /** POST /rooms/:roomId/raise-hand — listener requests to speak */
    static async raiseHand(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { roomId } = req.params as { roomId: string };
            const { message } = req.body;

            const request = await SpeakerRequestService.raiseHand(roomId, userId, message);
            return res.status(201).json(request);
        } catch (error: any) {
            if (error.message === "Already requested") return res.status(409).json({ error: error.message });
            return res.status(500).json({ error: "Failed to raise hand" });
        }
    }

    /** GET /rooms/:roomId/speaker-queue — host sees pending requests */
    static async getQueue(req: Request, res: Response) {
        try {
            const { roomId } = req.params as { roomId: string };
            const queue = await SpeakerRequestService.getPending(roomId);
            return res.json(queue);
        } catch (error) {
            return res.status(500).json({ error: "Failed to get queue" });
        }
    }

    /** POST /rooms/:roomId/approve-speaker/:requestId — host approves */
    static async approve(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { roomId, requestId } = req.params as { roomId: string; requestId: string };
            const request = await SpeakerRequestService.approve(roomId, requestId, userId);
            return res.json(request);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("already resolved")) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Failed to approve" });
        }
    }

    /** POST /rooms/:roomId/reject-speaker/:requestId — host rejects */
    static async reject(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { roomId, requestId } = req.params as { roomId: string; requestId: string };
            const request = await SpeakerRequestService.reject(roomId, requestId, userId);
            return res.json(request);
        } catch (error: any) {
            if (error.message.includes("not found") || error.message.includes("already resolved")) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Failed to reject" });
        }
    }

    /** POST /rooms/:roomId/cancel-hand — user cancels own request */
    static async cancel(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: "Authentication required" });

            const { roomId } = req.params as { roomId: string };
            const request = await SpeakerRequestService.cancel(roomId, userId);
            return res.json(request);
        } catch (error: any) {
            if (error.message === "No pending request found") {
                return res.status(404).json({ error: error.message });
            }
            return res.status(500).json({ error: "Failed to cancel" });
        }
    }
}
