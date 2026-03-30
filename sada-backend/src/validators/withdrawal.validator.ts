import { z } from "zod";

export const requestWithdrawalSchema = z.object({
    amount: z.number({ message: "Valid amount is required" }).positive("Valid amount is required"),
    payout_method: z.enum(["stripe", "bank"]).optional(),
    payout_details: z.record(z.string(), z.any()).optional(),
});

export const processWithdrawalSchema = z.object({
    approve: z.boolean({ message: "approve field is required" }),
    note: z.string().max(500).optional(),
});
