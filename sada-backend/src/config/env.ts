import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

function optionalEnv(name: string): string {
    const value = process.env[name]?.trim();
    return value || "";
}

function requiredEnv(name: string): string {
    const value = optionalEnv(name);
    if (isProduction && !value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export const vars = {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    db: {
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_NAME || "sada",
    },
    cloudflare: {
        appId: requiredEnv("CLOUDFLARE_APP_ID"),
        turnKeyId: requiredEnv("CLOUDFLARE_TURN_KEY_ID"),
        apiToken: requiredEnv("CLOUDFLARE_API_TOKEN"),
        appSecret: requiredEnv("CLOUDFLARE_APP_SECRET"),
    }
};
