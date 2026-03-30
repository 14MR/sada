import { Request, Response, NextFunction } from "express";

export function adminAuth(req: Request, res: Response, next: NextFunction) {
    const adminKey = req.headers["x-admin-key"] as string;

    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: "Forbidden: invalid admin key" });
    }

    next();
}
