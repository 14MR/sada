import { IsString, IsNotEmpty, IsOptional, MaxLength } from "class-validator";

export class CreateRoomDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    title!: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    category?: string;

    @IsString()
    @IsOptional()
    description?: string;
}

export class ManageSpeakerDto {
    @IsString()
    @IsNotEmpty()
    targetUserId!: string;

    @IsString()
    @IsNotEmpty()
    role!: string;
}
