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
        // WARNING: Defaults are for development convenience only.
        // In production, ALWAYS use environment variables.
        appId: process.env.CLOUDFLARE_APP_ID || "87cf1cf7-2e37-45c2-8593-2f3f622f83fb",
        turnKeyId: process.env.CLOUDFLARE_TURN_KEY_ID || "7d4ab122357ca883ff212d09f1cbf856",
        apiToken: process.env.CLOUDFLARE_API_TOKEN || "c7a14148ccad31352df1b25b2fb8e7137c7b9143c1dd2c5dcfef7d584b5e3d87",
        // Cloudflare Calls SFU App Secret - used to authenticate with the Calls API
        // This is different from the API token. Find it in Cloudflare Dashboard > Calls > your app.
        appSecret: process.env.CLOUDFLARE_APP_SECRET || "",
    }
};
