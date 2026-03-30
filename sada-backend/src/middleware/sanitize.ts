import { Request, Response, NextFunction } from "express";

const HTML_TAG_RE = /<[^>]*>/g;

function sanitizeValue(value: any): any {
    if (typeof value === "string") {
        return value.replace(HTML_TAG_RE, "");
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === "object") {
        const sanitized: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            sanitized[key] = sanitizeValue(value[key]);
        }
        return sanitized;
    }
    return value;
}

export function sanitize(req: Request, _res: Response, next: NextFunction): void {
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    next();
}
