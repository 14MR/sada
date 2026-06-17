export interface GemHttpClient {
    get: (url: string) => Promise<{ data: unknown }>;
    post: (url: string, body: unknown) => Promise<{ data: unknown }>;
}

export interface GemTokenStore {
    getItemAsync: (key: string) => Promise<string | null>;
}

export interface GemServiceOptions {
    receiptData?: string;
    platform?: 'apple' | 'google';
}

export const createGemService = (
    client: GemHttpClient,
    store: GemTokenStore,
    options: GemServiceOptions = {},
) => {
    const receiptData = options.receiptData || 'mock-receipt-data';
    const platform = options.platform || 'apple';

    return {
        getBalance: async () => {
            const userId = await store.getItemAsync('user_id');
            if (!userId) throw new Error('Not authenticated');

            const response = await client.get(`/gems/balance/${userId}`);
            return response.data;
        },

        purchaseGems: async (amount: number) => {
            const response = await client.post('/gems/purchase', {
                amount,
                receiptData,
                platform,
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
        },
    };
};
