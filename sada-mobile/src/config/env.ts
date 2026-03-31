import Constants from 'expo-constants';

function getEnvVar(key: string): string {
    const value = Constants.expoConfig?.extra?.[key];
    if (!value) {
        console.warn(`Missing environment variable: ${key}`);
    }
    return value || '';
}

export const ENV = {
    API_BASE_URL: getEnvVar('apiBaseUrl'),
    SOCKET_BASE_URL: getEnvVar('socketBaseUrl'),
    ENVIRONMENT: getEnvVar('environment') || 'development',
};

export const isDevelopment = ENV.ENVIRONMENT === 'development';
export const isProduction = ENV.ENVIRONMENT === 'production';
