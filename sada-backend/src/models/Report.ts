import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

export enum ReportStatus {
    PENDING = "pending",
    ACTIONED = "actioned",
    DISMISSED = "dismissed"
}

@Entity("reports")
export class Report {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    reporter_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "reporter_id" })
    reporter!: User;

    @Column()
    reported_user_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "reported_user_id" })
    reported_user!: User;

    @Column({ length: 50 })
    reason!: string;

    @Column("text", { nullable: true })
    description!: string;

    @Column({
        type: "enum",
        enum: ReportStatus,
        default: ReportStatus.PENDING
    })
    status!: ReportStatus;

    @CreateDateColumn()
    created_at!: Date;
}
