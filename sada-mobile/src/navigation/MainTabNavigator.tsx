import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { theme } from '../theme';
import { View } from 'react-native';

const Tab = createBottomTabNavigator();

// Simple icon placeholder since we haven't set up vector icons yet
const TabIcon = ({ color }: { color: string }) => (
    <View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 12 }} />
);

export const MainTabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
            }}
        >
            <Tab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <TabIcon color={color} />
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <TabIcon color={color} />
                }}
            />
        </Tab.Navigator>
    );
};
