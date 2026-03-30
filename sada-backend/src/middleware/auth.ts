import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV !== "test") {
        throw new Error("JWT_SECRET environment variable is required");
    }
    return secret || "test_only_secret";
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
    // Allow health checks
    if ((req.path === "/" || req.path === "/health") && req.method === "GET") {
        return next();
    }

    // Allow signin
    if (req.path.endsWith("/auth/signin") && req.method === "POST") {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, getJwtSecret()) as { id: string; username: string };
        (req as any).user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
