import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { GemTransaction } from "./GemTransaction";

export enum PaymentReceiptStatus {
    PROCESSED = "processed"
}

@Entity("payment_receipts")
export class PaymentReceipt {
    @PrimaryColumn({ length: 64 })
    receipt_hash!: string;

    @Column({ length: 20 })
    platform!: string;

    @Column()
    amount!: number;

    @Column({
        type: "enum",
        enum: PaymentReceiptStatus,
        default: PaymentReceiptStatus.PROCESSED
    })
    status!: PaymentReceiptStatus;

    @Column({ type: "varchar", nullable: true })
    provider_transaction_id!: string | null;

    @OneToOne(() => GemTransaction, { onDelete: "CASCADE" })
    @JoinColumn({ name: "gem_transaction_id" })
    gem_transaction!: GemTransaction;

    @Column()
    gem_transaction_id!: string;

    @CreateDateColumn()
    created_at!: Date;
}
