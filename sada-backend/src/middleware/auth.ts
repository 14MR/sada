import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test_secret";

export function getJwtSecret(): string {
    return JWT_SECRET;
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
        const payload = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
        (req as any).user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
