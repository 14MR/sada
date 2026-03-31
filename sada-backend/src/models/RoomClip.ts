import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";
import { Room } from "./Room";

@Entity("room_clips")
export class RoomClip {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid", name: "room_id" })
    @Index()
    roomId!: string;

    @ManyToOne(() => Room, { onDelete: "CASCADE" })
    @JoinColumn({ name: "room_id" })
    room!: Room;

    @Column({ type: "uuid", name: "creator_id" })
    creatorId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "creator_id" })
    creator!: User;

    @Column({ name: "start_time" })
    startTime!: number; // seconds

    @Column({ name: "end_time" })
    endTime!: number; // seconds

    @Column({ length: 200 })
    title!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;
}
