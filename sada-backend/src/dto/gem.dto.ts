import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export class PurchaseGemsDto {
    @IsNumber()
    @Min(1)
    amount!: number;
}

export class GiftGemsDto {
    @IsString()
    receiverId!: string;

    @IsNumber()
    @Min(1)
    amount!: number;

    @IsString()
    @IsOptional()
    roomId?: string;
}
