import client from './client';
import * as SecureStore from 'expo-secure-store';

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

export const AuthService = {
    signIn: async (identityToken: string, fullName?: string): Promise<AuthResponse> => {
        const response = await client.post('/auth/signin', {
            identityToken,
            fullName
        });
        if (response.data.token) {
            await AuthService.saveToken(response.data.token);
            await SecureStore.setItemAsync('user_profile', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    saveToken: async (token: string) => {
        await SecureStore.setItemAsync('auth_token', token);
    },

    getToken: async () => {
        return await SecureStore.getItemAsync('auth_token');
    },

    signOut: async () => {
        await SecureStore.deleteItemAsync('auth_token');
    },

    getCurrentUser: async (id: string): Promise<User> => {
        const response = await client.get(`/users/${id}`);
        await SecureStore.setItemAsync('user_profile', JSON.stringify(response.data));
        return response.data;
    }
};
