import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, SafeAreaView } from 'react-native';
import { Colors } from '../theme/Theme';

export default function ScreenWrapper({ children, noPadding = false }) {
    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: Colors.bodyBg }]}> 
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.container, !noPadding && styles.padding]}
            >
                {children}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)', // Very light tint for global contrast
    },
    safeArea: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    padding: {
        padding: 16,
    }
});
