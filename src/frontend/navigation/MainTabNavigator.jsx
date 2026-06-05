import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../theme/Theme';
import { useAuth } from '../../backend/services/AuthContext';

// Screens
import FarmerHomeScreen from '../screens/FarmerHomeScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import MyRentalsScreen from '../screens/MyRentalsScreen';
import GroupsListScreen from '../screens/GroupsListScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    const { user } = useAuth();
    const isFarmer = user?.role === 'farmer';

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Orders') iconName = focused ? 'cube' : 'cube-outline';
                    else if (route.name === 'Rentals') iconName = focused ? 'calendar' : 'calendar-outline';
                    else if (route.name === 'Groups') iconName = focused ? 'people' : 'people-outline';
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: Colors.forestGreen,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarStyle: {
                    backgroundColor: Colors.cream,
                    borderTopWidth: 0,
                    height: 64,
                    paddingBottom: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '700',
                },
                headerShown: false,
            })}
        >
            <Tab.Screen 
                name="Home" 
                component={isFarmer ? FarmerHomeScreen : DriverHomeScreen}
                options={{ title: 'Home' }}
            />
            <Tab.Screen 
                name="Orders" 
                component={MyOrdersScreen}
                options={{ title: 'Orders' }}
            />
            <Tab.Screen 
                name="Rentals" 
                component={MyRentalsScreen}
                options={{ title: 'Rentals' }}
            />
            <Tab.Screen 
                name="Groups" 
                component={GroupsListScreen}
                options={{ title: 'Groups' }}
            />
        </Tab.Navigator>
    );
}
