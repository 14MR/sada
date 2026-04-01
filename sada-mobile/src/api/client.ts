import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://sada.mustafin.dev/api';
const isLocalDevHost = /^https?:\/\/(10\.0\.2\.2|localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(rawBaseUrl);

// Local backend serves routes at root (e.g. /auth/signin), while production is behind /api.
const BASE_URL = (isLocalDevHost ? rawBaseUrl.replace(/\/api\/?$/, '') : rawBaseUrl).replace(/\/$/, '');

console.log('🌐 API Base URL:', BASE_URL);
console.log('📱 Is Device:', Constants.isDevice);
console.log('📱 Platform:', Platform.OS);

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor to add Token
client.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default client;
