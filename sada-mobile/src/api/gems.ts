import client from './client';
import * as SecureStore from 'expo-secure-store';

export const GemService = {
    getBalance: async () => {
        const userId = await SecureStore.getItemAsync('user_id');
        const response = await client.get(`/gems/balance/${userId}`);
        return response.data;
    },

    purchaseGems: async (amount: number) => {
        const response = await client.post('/gems/purchase', {
            amount,
            receiptData: 'mock-receipt-data',
            platform: 'apple',
        });
        return response.data;
    },

    sendGift: async (receiverId: string, amount: number, roomId?: string) => {
        const response = await client.post('/gems/gift', {
            receiverId,
            amount,
            roomId,
        });
        return response.data;
    }
};
