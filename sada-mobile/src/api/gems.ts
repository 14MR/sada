import client from './client';

export const GemService = {
    getBalance: async () => {
        const response = await client.get('/gems/balance');
        return response.data;
    },

    purchaseGems: async (packageId: string) => {
        // Mock purchase handled by backend for MVP
        const response = await client.post('/gems/purchase', {
            packageId,
            receipt: 'mock-receipt-data'
        });
        return response.data;
    },

    sendGift: async (receiverId: string, amount: number, roomId?: string) => {
        const response = await client.post('/gems/send', {
            receiverId,
            amount,
            roomId
        });
        return response.data;
    }
};
