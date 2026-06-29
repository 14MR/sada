import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

export enum TransactionType {
    PURCHASE = "purchase",
    GIFT = "gift",
    BONUS = "bonus"
}

export enum GemTransactionReferenceType {
    RECEIPT_HASH = "receipt_hash",
    ROOM_ID = "room_id"
}

@Entity("gem_transactions")
export class GemTransaction {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "sender_id" })
    sender!: User | null; // Null if system/purchase OR user deleted

    @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "receiver_id" })
    receiver!: User | null;

    @Column()
    amount!: number;

    @Column({
        type: "enum",
        enum: TransactionType,
        default: TransactionType.PURCHASE
    })
    type!: TransactionType;

    @Column({ type: "varchar", nullable: true })
    reference_id!: string | null;

    @Column({ type: "varchar", nullable: true })
    reference_type!: GemTransactionReferenceType | null;

    @CreateDateColumn()
    created_at!: Date;
}
