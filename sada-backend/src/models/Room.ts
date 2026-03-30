import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from "typeorm";
import { User } from "./User";
import { RoomParticipant } from "./RoomParticipant";

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

    @Column({ length: 50, nullable: true })
    @Index()
    category!: string;

    @Column({ length: 20, default: 'live' })
    @Index()
    status!: string;

    @Column({ default: 0 })
    listener_count!: number;

    @CreateDateColumn()
    started_at!: Date;

    @Column({ nullable: true })
    ended_at!: Date;

    @Column({ default: true })
    allow_speakers!: boolean;

    @Column({ default: true })
    chat_enabled!: boolean;

    @OneToMany(() => RoomParticipant, participant => participant.room)
    participants!: RoomParticipant[];
}
