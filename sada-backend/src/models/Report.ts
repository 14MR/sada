import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";

export enum ReportReason {
    HARASSMENT = "harassment",
    SPAM = "spam",
    HATE_SPEECH = "hate_speech",
    VIOLENCE = "violence",
    NUDITY = "nudity",
    OTHER = "other",
}

export enum ReportStatus {
    PENDING = "pending",
    REVIEWED = "reviewed",
    DISMISSED = "dismissed",
    ACTIONED = "actioned",
}

@Entity("reports")
export class Report {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid" })
    @Index()
    reporter_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "reporter_id" })
    reporter!: User;

    @Column({ type: "uuid" })
    @Index()
    reported_user_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "reported_user_id" })
    reported_user!: User;

    @Column({ type: "enum", enum: ReportReason })
    reason!: ReportReason;

    @Column({ type: "text", nullable: true })
    description!: string | null;

    @Column({ type: "uuid", nullable: true })
    room_id!: string | null; // If report is room-specific

    @Column({ length: 20, default: ReportStatus.PENDING })
    @Index()
    status!: ReportStatus;

    @CreateDateColumn()
    created_at!: Date;

    @Column({ type: "datetime", nullable: true })
    reviewed_at!: Date | null;

    @Column({ type: "uuid", nullable: true })
    reviewed_by!: string | null; // Admin who reviewed
}
