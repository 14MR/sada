import { IsString, IsNotEmpty } from "class-validator";

export class SignInDto {
    @IsString()
    @IsNotEmpty()
    identityToken!: string;

    @IsString()
    @IsNotEmpty()
    fullName?: string;
}
