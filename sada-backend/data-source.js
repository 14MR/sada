"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const env_1 = require("./src/config/env");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: env_1.vars.db.host,
    port: env_1.vars.db.port,
    username: env_1.vars.db.username,
    password: env_1.vars.db.password,
    database: env_1.vars.db.database,
    synchronize: false,
    logging: false,
    entities: ["src/models/**/*.ts"],
    migrations: ["src/migrations/**/*.ts"],
    subscribers: [],
});
