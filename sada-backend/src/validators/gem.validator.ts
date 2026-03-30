import { z } from "zod";

export const purchaseGemSchema = z.object({
    amount: z.number({ message: "Amount must be positive" }).int().positive("Amount must be positive"),
    receiptData: z.string().optional(),
    platform: z.enum(["apple", "google"]).optional(),
});

export const giftGemSchema = z.object({
    receiverId: z.string().min(1),
    amount: z.number({ message: "Amount must be positive" }).int().positive("Amount must be positive"),
    roomId: z.string().optional(),
});
