import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";

export enum WithdrawalStatus {
    PENDING = "pending",
    APPROVED = "approved",
    PROCESSING = "processing",
    COMPLETED = "completed",
    REJECTED = "rejected"
}

export enum PayoutMethod {
    STRIPE = "stripe",
    BANK = "bank"
}

@Entity("withdrawals")
export class Withdrawal {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column()
    amount!: number;

    @Column({
        type: "enum",
        enum: WithdrawalStatus,
        default: WithdrawalStatus.PENDING
    })
    status!: WithdrawalStatus;

    @Column({
        type: "enum",
        enum: PayoutMethod,
        default: PayoutMethod.STRIPE
    })
    payout_method!: PayoutMethod;

    @Column({ type: "jsonb", nullable: true })
    payout_details!: Record<string, any> | null;

    @Column({ nullable: true })
    stripe_transfer_id!: string | null;

    @CreateDateColumn({ name: "requested_at" })
    requested_at!: Date;

    @Column({ type: "timestamp", nullable: true })
    processed_at!: Date | null;

    @Column({ type: "text", nullable: true })
    admin_note!: string | null;
}
