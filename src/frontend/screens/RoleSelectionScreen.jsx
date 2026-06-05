import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../../backend/services/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';

const { width } = Dimensions.get('window');

export default function RoleSelectionScreen() {
    const { setRole, logout, isLoading } = useAuth();

    return (
        <ScreenWrapper noPadding>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.centeredContent}>
                    
                    <View style={styles.headerSection}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="leaf" size={32} color={Colors.agriGreen} />
                        </View>
                        <Text style={styles.title}>Your Role</Text>
                        <Text style={styles.subtitle}>How would you like to use FarmEquipConnect?</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.roleCard, { borderColor: Colors.agriGreen }]}
                        onPress={() => setRole('farmer')}
                        disabled={isLoading}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: Colors.agriGreenLight }]}>
                            <Ionicons name="tractor" size={32} color={Colors.agriGreen} />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.roleTitle}>Farmer</Text>
                            <Text style={styles.roleDesc}>I want to book machines for my fields and manage my farm operations.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.agriGreen} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.roleCard, { borderColor: Colors.primary }]}
                        onPress={() => setRole('driver')}
                        disabled={isLoading}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                            <Ionicons name="construct" size={32} color={Colors.primary} />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.roleTitle}>Operator</Text>
                            <Text style={styles.roleDesc}>I am a professional driver looking for jobs and operating machinery.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={logout}
                        disabled={isLoading}
                    >
                        <Ionicons name="log-out-outline" size={16} color={Colors.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={styles.logoutText}>Not you? Switch account</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingVertical: 60, paddingHorizontal: 24, flexGrow: 1, justifyContent: 'center' },
    centeredContent: { alignSelf: 'center', width: '100%', maxWidth: 450 },
    
    headerSection: { alignItems: 'center', marginBottom: 48 },
    logoCircle: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: Colors.agriGreenLight, justifyContent: 'center',
        alignItems: 'center', marginBottom: 20,
        ...Shadows.soft
    },
    title: { fontSize: 28, fontWeight: '900', color: Colors.primary },
    subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 8, fontWeight: '500', textAlign: 'center' },

    roleCard: {
        backgroundColor: '#FFF', borderRadius: BorderRadius.l,
        padding: 24, marginBottom: 20, flexDirection: 'row',
        alignItems: 'center', borderWidth: 1.5, ...Shadows.strong,
        minHeight: 120
    },
    iconBox: {
        width: 60, height: 60, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 20
    },
    cardText: { flex: 1 },
    roleTitle: { fontSize: 20, fontWeight: '900', color: Colors.primary, marginBottom: 4 },
    roleDesc: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500', lineHeight: 18 },

    logoutBtn: {
        marginTop: 32, padding: 12, borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
    },
    logoutText: {
        color: Colors.textSecondary, fontWeight: '700',
        fontSize: 14,
    },
});

