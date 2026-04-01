import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from "typeorm";
import { User } from "./User";
import { RoomParticipant } from "./RoomParticipant";
import { Category } from "./Category";

@Entity("rooms")
export class Room {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    host_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "host_id" })
    host!: User;

    @Column({ length: 100 })
    @Index()
    title!: string;

    @Column("text", { nullable: true })
    description!: string;

    @Column({ type: "uuid", nullable: true, name: "category_id" })
    @Index()
    categoryId!: string | null;

    @ManyToOne(() => Category, { onDelete: "SET NULL" })
    @JoinColumn({ name: "category_id" })
    category!: Category | null;

    @Column({ length: 20, default: 'live' })
    @Index()
    status!: string;

    @Column({ default: 0 })
    listener_count!: number;

    @CreateDateColumn()
    started_at!: Date;

    @Column({ nullable: true })
    ended_at!: Date;

    @Column({ type: "timestamp", nullable: true, name: "scheduled_at" })
    scheduledAt!: Date | null;

    @Column({ default: true })
    allow_speakers!: boolean;

    @Column({ default: true })
    chat_enabled!: boolean;

    @Column("simple-json", { default: "[]" })
    tags!: string[];

    @Column("simple-json", { nullable: true })
    summary!: Record<string, any> | null;

    @OneToMany(() => RoomParticipant, participant => participant.room)
    participants!: RoomParticipant[];
}
