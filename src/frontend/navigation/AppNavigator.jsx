import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../../backend/services/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../theme/Theme';

// Screens
import LoginScreen from '../screens/LoginScreen';
import OtpVerificationScreen from '../screens/OtpVerificationScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import FarmerHomeScreen from '../screens/FarmerHomeScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import MachineDetailScreen from '../screens/MachineDetailScreen';
import AddMachineScreen from '../screens/AddMachineScreen';
import FarmerBookingsScreen from '../screens/FarmerBookingsScreen';
import DriverScheduleScreen from '../screens/DriverScheduleScreen';
import SignUpScreen from '../screens/SignUpScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VideoHandshakeScreen from '../screens/VideoHandshakeScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PaymentWebViewScreen from '../screens/PaymentWebViewScreen';
import EarningsScreen from '../screens/EarningsScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminMachinesScreen from '../screens/AdminMachinesScreen';
import AdminBookingsScreen from '../screens/AdminBookingsScreen';
import AdminPaymentsScreen from '../screens/AdminPaymentsScreen';
import AdminUserDetailsScreen from '../screens/AdminUserDetailsScreen';
import DriverSelectionScreen from '../screens/DriverSelectionScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import GroupBookingScreen from '../screens/GroupBookingScreen';

// Navigation
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        // Initial Loading state
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bgDark }}>
                <ActivityIndicator size="large" color={Colors.gold} />
            </View>
        )
    }

    const renderMainStack = () => {
        if (user.role === 'admin') {
            return (
                <>
                    <Stack.Screen name="AdminHome" component={AdminDashboardScreen} />
                    {/* admins should also be able to open the machine form for editing */}
                    <Stack.Screen name="AddMachine" component={AddMachineScreen} options={{ headerShown: true, title: 'List Machine', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                    <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ headerShown: true, title: 'Users', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                    <Stack.Screen name="AdminUserDetails" component={AdminUserDetailsScreen} options={{ headerShown: true, title: 'User Details', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                    <Stack.Screen name="AdminMachines" component={AdminMachinesScreen} options={{ headerShown: true, title: 'Machines', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                    <Stack.Screen name="AdminBookings" component={AdminBookingsScreen} options={{ headerShown: true, title: 'Bookings', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                    <Stack.Screen name="AdminPayments" component={AdminPaymentsScreen} options={{ headerShown: true, title: 'Payments', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                </>
            );
        }

        // For farmers and drivers, use tab navigator as main stack
        return (
            <>
                {/* Main Tab Navigation with Home, Orders, Rentals, Groups */}
                <Stack.Screen 
                    name="MainTabs" 
                    component={MainTabNavigator}
                    options={{ headerShown: false }}
                />
                
                {/* Modal-style screens that appear on top of tabs */}
                {user.role === 'farmer' && (
                    <>
                        <Stack.Screen name="AddMachine" component={AddMachineScreen} options={{ headerShown: true, title: 'List Machine', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                        <Stack.Screen name="FarmerBookings" component={FarmerBookingsScreen} options={{ headerShown: true, title: 'My Listings', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                        <Stack.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true, title: 'Payment', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                        <Stack.Screen name="Earnings" component={EarningsScreen} options={{ headerShown: false }} />
                    </>
                )}
                {user.role === 'driver' && (
                    <Stack.Screen name="DriverSchedule" component={DriverScheduleScreen} options={{ headerShown: true, title: 'My Schedule', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                )}
                
                {/* Shared screens accessible from tabs */}
                <Stack.Screen
                    name="MachineDetail"
                    component={MachineDetailScreen}
                    options={{
                        headerShown: true,
                        title: 'Machine Detail',
                        headerStyle: { backgroundColor: Colors.navy },
                        headerTintColor: Colors.white
                    }}
                />
                <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'App Settings', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                <Stack.Screen
                    name="VideoHandshake"
                    component={VideoHandshakeScreen}
                    options={{ title: 'Video Handshake' }}
                />
                <Stack.Screen
                    name="DriverSelection"
                    component={DriverSelectionScreen}
                    options={{ headerShown: true, title: 'Select Operator', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }}
                />
                <Stack.Screen
                    name="GroupDetails"
                    component={GroupDetailsScreen}
                    options={{ headerShown: true, title: 'Group Details', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }}
                />
                <Stack.Screen
                    name="GroupBooking"
                    component={GroupBookingScreen}
                    options={{ headerShown: true, title: 'Group Booking', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }}
                />
                <Stack.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="PaymentWebView"
                    component={PaymentWebViewScreen}
                    options={{ headerShown: false }}
                />
            </>
        );
    };

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    // Auth Stack
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: true, title: 'Sign Up', headerStyle: { backgroundColor: Colors.navy }, headerTintColor: Colors.white }} />
                        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
                    </>
                ) : !user.role ? (
                    // Role Selection Stack (The Gateway)
                    <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                ) : (
                    // Main App Stack
                    renderMainStack()
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
