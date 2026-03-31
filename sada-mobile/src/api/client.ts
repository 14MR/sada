import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ENV } from '../config/env';

console.log('🌐 API Base URL:', ENV.API_BASE_URL);
console.log('📱 Is Device:', Constants.isDevice);
console.log('📱 Platform:', Platform.OS);

const client = axios.create({
    baseURL: ENV.API_BASE_URL,
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
