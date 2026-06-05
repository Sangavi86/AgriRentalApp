import React, { useEffect } from 'react';
// Triggering re-bundle for new UI structure
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { AuthProvider } from './src/backend/services/AuthContext';
import { ConfigProvider } from './src/backend/services/ConfigContext';
import AppNavigator from './src/frontend/navigation/AppNavigator';
import ErrorBoundary from './src/frontend/components/ErrorBoundary';

export default function App() {
    useEffect(() => {
        // Inject global animation styles for web platform
        if (Platform.OS === 'web') {
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                @keyframes slideUpFade {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes shimmer {
                    0% {
                        background-position: -1000px 0;
                    }
                    100% {
                        background-position: 1000px 0;
                    }
                }
                
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.5;
                    }
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }, []);

    return (
        <SafeAreaProvider>
            <ConfigProvider>
                <ErrorBoundary>
                    <AuthProvider>
                        <StatusBar style="auto" />
                        <AppNavigator />
                    </AuthProvider>
                </ErrorBoundary>
            </ConfigProvider>
        </SafeAreaProvider>
    );
}
