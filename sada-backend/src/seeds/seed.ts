import "reflect-metadata";
import { AppDataSource } from "../config/data-source";

export async function seed() {
    try {
        await AppDataSource.initialize();
        console.log("Database connection established for seeding");
        console.log("Seed completed successfully");
        await AppDataSource.destroy();
    } catch (error) {
        console.error("Error during seeding:", error);
        process.exit(1);
    }
}

seed();
