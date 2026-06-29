import client from './client';
import * as SecureStore from 'expo-secure-store';
import { createAuthService } from './authCore';
export type { AuthResponse, User } from './authCore';
export { getLoginErrorMessage } from './authCore';

export const AuthService = createAuthService(client, SecureStore);
