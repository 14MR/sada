import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaymentReceipts1710000000000 implements MigrationInterface {
    name = "CreatePaymentReceipts1710000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "payment_receipts" (
                "receipt_hash" varchar(64) NOT NULL,
                "platform" varchar(20) NOT NULL,
                "amount" integer NOT NULL,
                "status" varchar NOT NULL DEFAULT 'processed',
                "provider_transaction_id" varchar,
                "gem_transaction_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_payment_receipts_receipt_hash" PRIMARY KEY ("receipt_hash"),
                CONSTRAINT "UQ_payment_receipts_gem_transaction_id" UNIQUE ("gem_transaction_id"),
                CONSTRAINT "FK_payment_receipts_gem_transaction_id" FOREIGN KEY ("gem_transaction_id") REFERENCES "gem_transactions"("id") ON DELETE CASCADE
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "payment_receipts"`);
    }
}
