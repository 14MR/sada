import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
    user?: { id: string; username: string };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next();
    }

    const token = authHeader.split(" ")[1];

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET env var is required");

        const decoded = jwt.verify(token, secret) as { id: string; username: string };
        req.user = decoded;
    } catch {
        // Token invalid — leave req.user undefined, individual routes enforce auth
    }

    next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
}
