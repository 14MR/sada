import dotenv from "dotenv";

dotenv.config();

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
        appId: process.env.CLOUDFLARE_APP_ID || (() => { throw new Error("CLOUDFLARE_APP_ID env var is required") })(),
        turnKeyId: process.env.CLOUDFLARE_TURN_KEY_ID || (() => { throw new Error("CLOUDFLARE_TURN_KEY_ID env var is required") })(),
        apiToken: process.env.CLOUDFLARE_API_TOKEN || (() => { throw new Error("CLOUDFLARE_API_TOKEN env var is required") })(),
    }
};
