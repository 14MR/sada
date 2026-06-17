export interface User {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    bio: string | null;
    gem_balance: number;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface AuthHttpClient {
    post: (url: string, body: unknown) => Promise<{ data: AuthResponse }>;
    get: (url: string) => Promise<{ data: User }>;
}

export interface AuthTokenStore {
    setItemAsync: (key: string, value: string) => Promise<void>;
    getItemAsync: (key: string) => Promise<string | null>;
    deleteItemAsync: (key: string) => Promise<void>;
}

export const createAuthService = (client: AuthHttpClient, store: AuthTokenStore) => ({
    signIn: async (identityToken: string, fullName?: string): Promise<AuthResponse> => {
        const response = await client.post('/auth/signin', {
            identityToken,
            fullName,
        });

        if (response.data.token) {
            await store.setItemAsync('auth_token', response.data.token);
            await store.setItemAsync('user_profile', JSON.stringify(response.data.user));
        }

        return response.data;
    },

    saveToken: async (token: string) => {
        await store.setItemAsync('auth_token', token);
    },

    getToken: async () => {
        return await store.getItemAsync('auth_token');
    },

    signOut: async () => {
        await store.deleteItemAsync('auth_token');
    },

    getCurrentUser: async (id: string): Promise<User> => {
        const response = await client.get(`/users/${id}`);
        await store.setItemAsync('user_profile', JSON.stringify(response.data));
        return response.data;
    },
});
