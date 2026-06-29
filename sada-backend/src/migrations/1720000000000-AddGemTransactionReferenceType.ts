import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGemTransactionReferenceType1720000000000 implements MigrationInterface {
    name = "AddGemTransactionReferenceType1720000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "gem_transactions"
            ADD COLUMN IF NOT EXISTS "reference_type" varchar
        `);
        await queryRunner.query(`
            UPDATE "gem_transactions"
            SET "reference_type" = CASE
                WHEN "type" = 'purchase' AND "reference_id" IS NOT NULL THEN 'receipt_hash'
                WHEN "type" = 'gift' AND "reference_id" IS NOT NULL THEN 'room_id'
                ELSE NULL
            END
            WHERE "reference_type" IS NULL
              AND "reference_id" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "gem_transactions"
            DROP COLUMN IF EXISTS "reference_type"
        `);
    }
}
