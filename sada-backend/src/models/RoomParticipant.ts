import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { Room } from "./Room";

@Entity("room_participants")
export class RoomParticipant {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    room_id!: string;

    @ManyToOne(() => Room, room => room.participants)
    @JoinColumn({ name: "room_id" })
    room!: Room;

    @Column()
    user_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user!: User;

    @Column({ length: 20, default: 'listener' })
    role!: string; // 'host', 'speaker', 'listener'

    @CreateDateColumn()
    joined_at!: Date;

    @Column({ nullable: true })
    left_at!: Date;
}
