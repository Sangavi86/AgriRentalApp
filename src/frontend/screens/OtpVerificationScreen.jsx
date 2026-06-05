import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Shadows, Glass } from '../theme/Theme';
import { useAuth } from '../../backend/services/AuthContext';
import { useConfig } from '../../backend/services/ConfigContext';

export default function OtpVerificationScreen({ route, navigation }) {
    const { phoneNumber } = route.params;
    const { login, setRole } = useAuth();
    const { config } = useConfig();
    const [otp, setOtp] = useState(['', '', '', '']);
    const [verifying, setVerifying] = useState(false);

    // Refs
    const ref0 = useRef(null);
    const ref1 = useRef(null);
    const ref2 = useRef(null);
    const ref3 = useRef(null);
    const refs = [ref0, ref1, ref2, ref3];

    const handleTextChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text.length === 1 && index < 3) refs[index + 1].current?.focus();
        if (text.length === 0 && index > 0) refs[index - 1].current?.focus();
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
            refs[index - 1].current?.focus();
        }
    };

    const handleVerify = async () => {
        const { registerData } = route.params || {};
        const otpString = otp.join('');
        if (otpString.length < 4) return;
        setVerifying(true);
        setTimeout(async () => {
            setVerifying(false);
            try {
                const loggedUser = await login(phoneNumber);
                if (loggedUser && registerData && registerData.role) {
                    await setRole(registerData.role, registerData, loggedUser);
                }
            } catch (err) {
                console.error(err);
            }
        }, 1500);
    };

    return (
        <ScreenWrapper noPadding>
            <View style={styles.centerContainer}>
                {/* Added extra lighter glass for visibility */}
                <View style={styles.glassCard}>
                    <Text style={styles.title}>Verification</Text>
                    <Text style={styles.subtitle}>Enter 4-digit code sent to {phoneNumber}</Text>

                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={refs[index]}
                                style={styles.otpBox}
                                maxLength={1}
                                keyboardType="number-pad"
                                value={digit}
                                onChangeText={(text) => handleTextChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                placeholderTextColor="rgba(0,0,0,0.3)"
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleVerify}
                    >
                        {verifying ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.buttonText}>Verify</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.link}>Change Number</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.m,
    },
    glassCard: {
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 24,
        borderColor: 'rgba(212,175,55,0.2)',
        borderWidth: 1,
        padding: Spacing.xl,
        paddingVertical: 30,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        alignItems: 'center',
        ...Shadows.strong,
    },
    title: {
        fontSize: FontSize.headline,
        fontWeight: 'bold',
        color: Colors.navy,
        marginBottom: Spacing.s,
    },
    subtitle: {
        fontSize: FontSize.body,
        color: Colors.textSecondary,
        marginBottom: Spacing.l,
        textAlign: 'center',
        opacity: 0.8,
        paddingHorizontal: 10,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: Spacing.xl,
    },
    otpBox: {
        ...Glass.input,
        backgroundColor: '#fff',
        width: 44,
        height: 50,
        borderRadius: BorderRadius.m,
        fontSize: FontSize.title,
        textAlign: 'center',
        fontWeight: 'bold',
        color: Colors.navy,
        borderColor: 'rgba(10,25,47,0.1)',
        borderWidth: 1,
        ...Shadows.soft,
    },
    button: {
        backgroundColor: Colors.navy,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.m,
        borderRadius: BorderRadius.round,
        width: '100%',
        alignItems: 'center',
        marginBottom: Spacing.m,
        ...Shadows.soft,
    },
    buttonText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: FontSize.body,
        textTransform: 'uppercase',
    },
    link: {
        color: Colors.navyLight,
        fontWeight: '600',
    }
});

