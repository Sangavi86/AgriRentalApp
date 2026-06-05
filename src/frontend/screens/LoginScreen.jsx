import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, ensureAuth } from '../../backend/firebase/config';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';
import { useAuth } from '../../backend/services/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGetOtp = async () => {
        if (phoneNumber.length !== 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        try {
            await ensureAuth();
            const usersRef = collection(db, 'users');
            let q = query(usersRef, where('phoneNumber', '==', phoneNumber));
            let snap = await getDocs(q);
            let foundPhone = phoneNumber;
            if (snap.empty) {
                q = query(usersRef, where('phoneNumber', '==', `+91${phoneNumber}`));
                snap = await getDocs(q);
                if (!snap.empty) foundPhone = `+91${phoneNumber}`;
            }
            await login(foundPhone);
        } catch (e) {
            Alert.alert('Error', 'Verification failed. Try again.');
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper noPadding>
            <View style={styles.container}>
                <View style={styles.card}>
                    {/* Branding */}
                    <View style={styles.brandContainer}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="leaf" size={32} color={Colors.agriGreen} />
                        </View>
                        <Text style={styles.title}>FarmEquipConnect</Text>
                        <Text style={styles.subtitle}>Smarter farming, Together.</Text>
                    </View>

                    <Text style={styles.welcomeLabel}>Sign in to continue</Text>

                    {/* Input */}
                    <View style={styles.inputWrapper}>
                        <View style={styles.countryCode}>
                            <Text style={styles.countryCodeText}>+91</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            maxLength={10}
                        />
                        {phoneNumber.length === 10 && (
                            <View style={styles.checkIcon}>
                                <Ionicons name="checkmark-circle" size={20} color={Colors.agriGreen} />
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, phoneNumber.length !== 10 && styles.buttonDisabled]}
                        onPress={handleGetOtp}
                        disabled={loading || phoneNumber.length !== 10}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : (
                            <Text style={styles.buttonText}>Get Started</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                            <Text style={styles.footerLink}>Register now</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" />
                    <Text style={styles.infoText}>Secure login via OTP verification</Text>
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: {
        width: '100%', maxWidth: 400, backgroundColor: '#FFF',
        borderRadius: BorderRadius.l, padding: 32, ...Shadows.strong,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    brandContainer: { alignItems: 'center', marginBottom: 40 },
    logoCircle: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: Colors.agriGreenLight, justifyContent: 'center',
        alignItems: 'center', marginBottom: 16,
        transform: [{ rotate: '-10deg' }]
    },
    title: { fontSize: 28, fontWeight: '900', color: Colors.primary, letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },

    welcomeLabel: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginBottom: 20, textAlign: 'center' },

    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8FAFC', borderRadius: BorderRadius.m,
        borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24,
        paddingHorizontal: 12, height: 56,
    },
    countryCode: { paddingRight: 12, borderRightWidth: 1, borderRightColor: '#E2E8F0', height: '40%', justifyContent: 'center' },
    countryCodeText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
    input: { flex: 1, height: '100%', paddingLeft: 12, fontSize: 16, fontWeight: '600', color: Colors.primary },
    checkIcon: { marginLeft: 8 },

    button: {
        backgroundColor: Colors.primary, height: 56, borderRadius: BorderRadius.m,
        justifyContent: 'center', alignItems: 'center', ...Shadows.soft
    },
    buttonDisabled: { backgroundColor: '#CBD5E1' },
    buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { fontSize: 14, color: Colors.textSecondary },
    footerLink: { fontSize: 14, color: Colors.agriGreen, fontWeight: '800' },

    infoBox: { flexDirection: 'row', alignItems: 'center', marginTop: 40, gap: 6 },
    infoText: { fontSize: 12, color: '#64748B', fontWeight: '500' }
});

