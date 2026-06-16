import { CorsOptions } from "cors";

function parseOrigins(): string[] | undefined {
    const rawOrigins = process.env.CORS_ORIGINS?.trim();
    const isProduction = process.env.NODE_ENV === "production";

    if (!rawOrigins || rawOrigins === "*") {
        if (isProduction) {
            throw new Error("CORS_ORIGINS must list explicit origins in production");
        }
        return undefined;
    }

    const origins = rawOrigins
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean);

    if (origins.length === 0 || origins.includes("*")) {
        if (isProduction) {
            throw new Error("CORS_ORIGINS must list explicit origins in production");
        }
        return undefined;
    }

    return origins;
}

export function getExpressCorsOptions(): CorsOptions {
    const origins = parseOrigins();
    return origins ? { origin: origins } : {};
}

export function getSocketCorsOrigin(): string | string[] {
    return parseOrigins() ?? "*";
}
