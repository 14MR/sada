import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { Room } from "./Room";
import { User } from "./User";

export enum RecordingStatus {
    RECORDING = "recording",
    STOPPED = "stopped",
    PROCESSING = "processing",
    PUBLISHED = "published",
    FAILED = "failed",
}

@Entity("room_recordings")
export class RoomRecording {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "uuid", name: "room_id" })
    @Index()
    room_id!: string;

    @ManyToOne(() => Room, { onDelete: "CASCADE" })
    @JoinColumn({ name: "room_id" })
    room!: Room;

    @Column({ type: "uuid", name: "host_id" })
    @Index()
    host_id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "host_id" })
    host!: User;

    @Column({ length: 100 })
    title!: string;

    @Column("text", { nullable: true })
    description!: string | null;

    @Column({ name: "duration_seconds", nullable: true })
    duration_seconds!: number | null;

    @Column({ name: "file_url", nullable: true })
    file_url!: string | null;

    @Column({ name: "file_size_bytes", nullable: true })
    file_size_bytes!: number | null;

    @Column({ length: 20, default: RecordingStatus.RECORDING })
    @Index()
    status!: RecordingStatus;

    @Column({ name: "started_at", type: "timestamp" })
    started_at!: Date;

    @Column({ name: "stopped_at", type: "timestamp", nullable: true })
    stopped_at!: Date | null;

    @Column({ default: 0, name: "listener_count" })
    listener_count!: number;

    @Column({ default: 0, name: "participant_count" })
    participant_count!: number;

    @Column({ default: 0, name: "play_count" })
    play_count!: number;
}
