import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

export enum TransactionType {
    PURCHASE = "purchase",
    GIFT = "gift",
    BONUS = "bonus"
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

    @Column({ nullable: true })
    reference_id!: string; // e.g., Room ID if gifted in a room, or Payment ID

    @CreateDateColumn()
    created_at!: Date;
}
