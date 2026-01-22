import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { AuthService } from '../api/auth';
import * as SecureStore from 'expo-secure-store';

export const LoginScreen = ({ navigation }: any) => {
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async () => {
        setLoading(true);
        try {
            // MOCK Apple Identity Token for Development
            // In a real app, use expo-apple-authentication
            const mockIdentityToken = `dev-user-${Date.now()}`;
            const mockName = "Mobile Dev User";

            const data = await AuthService.signIn(mockIdentityToken, mockName);

            await AuthService.saveToken(data.token);

            // Store user ID for later use (simple approach for now)
            await SecureStore.setItemAsync('user_id', data.user.id);

            navigation.replace('Home');
        } catch (error: any) {
            console.error('❌ Login Failed:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error response:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
            console.error('❌ Request URL:', error.config?.url);
            console.error('❌ Base URL:', error.config?.baseURL);

            Alert.alert(
                'Login Failed',
                `Error: ${error.message}\n\nCheck console for details`,
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>SADA صدى</Text>
                <Text style={styles.subtitle}>Voices of the Arab World</Text>

                <TouchableOpacity
                    style={[styles.button, loading && { opacity: 0.7 }]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? "Signing in..." : "Sign in with Apple (Dev)"}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    title: {
        fontSize: 48,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: theme.spacing.s,
    },
    subtitle: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xxl,
    },
    button: {
        backgroundColor: '#fff',
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.l,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 16,
    },
});
