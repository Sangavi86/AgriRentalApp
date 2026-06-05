import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Glass, Shadows } from '../theme/Theme';
import { useConfig } from '../../backend/services/ConfigContext';
import { useAuth } from '../../backend/services/AuthContext';

export default function SignUpScreen({ navigation }) {
    const { config } = useConfig();
    const { login } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('FARMER');
    // Driver specific fields
    const [district, setDistrict] = useState('');
    const [state, setState] = useState('');
    const [capabilities, setCapabilities] = useState([]);
    const [customSpecialty, setCustomSpecialty] = useState('');

    const specialityOptions = [
        'Tractor 🚜',
        'Harvester 🌾',
        'Drone 🚁',
        'Baler 🧺',
        'Plow 🛠️',
        'Seeder 🌱',
        'Loader 🏗️',
        'Sprayer 💧',
        'Transporter 🚚',
        'Irrigator 💦'
    ];

    const handleSignUp = async () => {
        if (!name.trim()) {
            Alert.alert("Input Error", "Please enter your full name");
            return;
        }
        if (phone.length !== 10 || !/^\d+$/.test(phone)) {
            Alert.alert("Input Error", "Enter a valid 10-digit phone number");
            return;
        }

        if (role === 'DRIVER') {
            if (!district.trim() || !state.trim()) {
                Alert.alert("Input Error", "Drivers must provide District and State for assignment.");
                return;
            }
        }

        // Simulate sign up -> go to OTP
        // We pass the registration data through to OTP or save locally for demo
        const finalCapabilities = [...capabilities];
        const custom = customSpecialty.trim();
        if (custom && !finalCapabilities.includes(custom)) {
            finalCapabilities.push(custom);
        }

        navigation.navigate('OtpVerification', {
            phoneNumber: phone,
            registerData: {
                name,
                role: role.toLowerCase(),
                district,
                state,
                capabilities: finalCapabilities // Added for operators
            }
        });
    };

    return (
        <ScreenWrapper>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.m }}>

                    <View style={styles.card}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join FarmEquipConnect Community</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="John Doe"
                                placeholderTextColor={Colors.navyLight}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="9876543210"
                                placeholderTextColor={Colors.navyLight}
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>

                        <Text style={styles.label}>I am a...</Text>
                        <View style={styles.roleRow}>
                            <TouchableOpacity
                                style={[styles.roleBtn, role === 'FARMER' && styles.roleActive]}
                                onPress={() => setRole('FARMER')}
                            >
                                <Text style={[styles.roleText, role === 'FARMER' && styles.roleTextActive]}>Farmer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleBtn, role === 'DRIVER' && styles.roleActive]}
                                onPress={() => setRole('DRIVER')}
                            >
                                <Text style={[styles.roleText, role === 'DRIVER' && styles.roleTextActive]}>Operator</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Operator Fields */}
                        {role === 'DRIVER' && (
                            <View style={styles.driverFade}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>District</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Coimbatore"
                                        placeholderTextColor={Colors.navyLight}
                                        value={district}
                                        onChangeText={setDistrict}
                                    />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>State</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Tamil Nadu"
                                        placeholderTextColor={Colors.navyLight}
                                        value={state}
                                        onChangeText={setState}
                                    />
                                </View>
                                
                                <Text style={styles.label}>I can operate:</Text>
                                <View style={styles.capabilityRow}>
                                    {specialityOptions.map(cap => (
                                        <TouchableOpacity 
                                            key={cap}
                                            style={[styles.capBtn, capabilities.includes(cap) && styles.capBtnActive]}
                                            onPress={() => {
                                                if (capabilities.includes(cap)) {
                                                    setCapabilities(capabilities.filter(c => c !== cap));
                                                } else {
                                                    setCapabilities([...capabilities, cap]);
                                                }
                                            }}
                                        >
                                            <Text style={[styles.capText, capabilities.includes(cap) && styles.capTextActive]}>
                                                {cap}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Other speciality</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Type your speciality"
                                        placeholderTextColor={Colors.navyLight}
                                        value={customSpecialty}
                                        onChangeText={setCustomSpecialty}
                                    />
                                </View>
                            </View>
                        )}

                        <TouchableOpacity style={styles.loginBtn} onPress={handleSignUp}>
                            <Text style={styles.loginBtnText}>Sign Up</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: Spacing.m }}>
                            <Text style={styles.linkText}>Already have an account? <Text style={{ fontWeight: 'bold', color: Colors.gold }}>Login</Text></Text>
                        </TouchableOpacity>

                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    card: {
        ...Glass.container,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        paddingVertical: 30, ...Shadows.strong
    },
    title: {
        fontSize: FontSize.headline,
        fontWeight: 'bold',
        color: Colors.navy,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: FontSize.body,
        color: Colors.navyLight,
        textAlign: 'center',
        marginBottom: Spacing.l,
    },
    inputGroup: {
        marginBottom: Spacing.m,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.navy,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    input: {
        ...Glass.input,
        backgroundColor: 'rgba(255,255,255,0.7)',
        color: Colors.navy,
    },
    roleRow: {
        flexDirection: 'row',
        marginBottom: Spacing.l,
        gap: Spacing.m,
    },
    roleBtn: {
        flex: 1,
        padding: Spacing.m,
        borderRadius: BorderRadius.m,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    roleActive: {
        borderColor: Colors.gold,
        backgroundColor: Colors.white,
    },
    roleText: { color: Colors.navy, fontWeight: 'bold' },
    roleTextActive: { color: Colors.primary },
    driverFade: {
        padding: Spacing.m,
        backgroundColor: 'rgba(255,215,0,0.05)',
        borderRadius: 12,
        marginBottom: Spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.2)'
    },
    loginBtn: {
        backgroundColor: Colors.navy,
        paddingVertical: Spacing.m,
        borderRadius: BorderRadius.m,
        alignItems: 'center',
        marginTop: Spacing.s,
    },
    loginBtnText: {
        color: Colors.white,
        fontSize: FontSize.title,
        fontWeight: 'bold',
    },
    linkText: {
        textAlign: 'center',
        color: Colors.navy,
    },
    capabilityRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    capBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderWidth: 1,
        borderColor: '#DDD',
    },
    capBtnActive: {
        backgroundColor: Colors.gold,
        borderColor: Colors.gold,
    },
    capText: {
        fontSize: 12,
        color: Colors.navy,
        fontWeight: '700',
    },
    capTextActive: {
        color: Colors.white,
    },
});

