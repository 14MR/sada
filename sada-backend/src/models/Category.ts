import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("categories")
export class Category {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ length: 50 })
    name!: string;

    @Column({ length: 50, name: "name_ar" })
    nameAr!: string;

    @Column({ length: 50, nullable: true })
    icon!: string;

    @Column({ length: 50, unique: true })
    @Index()
    slug!: string;

    @Column({ length: 7, nullable: true })
    color!: string;
}
