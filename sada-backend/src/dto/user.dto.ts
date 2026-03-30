import { IsString, IsOptional, MaxLength } from "class-validator";

export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    @MaxLength(50)
    username?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    display_name?: string;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    avatar_url?: string;

    @IsString()
    @IsOptional()
    language?: string;
}
