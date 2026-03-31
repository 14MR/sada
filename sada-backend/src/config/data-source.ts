import "reflect-metadata";
import { DataSource } from "typeorm";
import { vars } from "./env";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: vars.db.host,
    port: vars.db.port,
    username: vars.db.username,
    password: vars.db.password,
    database: vars.db.database,
    synchronize: false,
    logging: false,
    entities: ["src/models/**/*.ts"],
    migrations: ["src/migrations/**/*.ts"],
    subscribers: [],
});
