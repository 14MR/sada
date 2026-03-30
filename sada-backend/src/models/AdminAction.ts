import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity("admin_actions")
export class AdminAction {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    admin_key!: string;

    @Column()
    action_type!: string;

    @Column({ nullable: true })
    target_user_id!: string;

    @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "target_user_id" })
    target_user!: User | null;

    @Column({ nullable: true })
    target_report_id!: string;

    @Column({ type: "json", nullable: true })
    details!: Record<string, any>;

    @CreateDateColumn()
    created_at!: Date;
}
