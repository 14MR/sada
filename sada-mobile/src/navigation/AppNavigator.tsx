import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { CreateRoomScreen } from '../screens/CreateRoomScreen';
import { RoomScreen } from '../screens/RoomScreen';
import { GemsScreen } from '../screens/GemsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { theme } from '../theme';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.colors.background },
                }}
            >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Home" component={MainTabNavigator} />
                <Stack.Screen
                    name="CreateRoom"
                    component={CreateRoomScreen}
                    options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                    name="Room"
                    component={RoomScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Gems"
                    component={GemsScreen}
                    options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                    name="Notifications"
                    component={NotificationsScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
