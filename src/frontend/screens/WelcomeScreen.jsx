import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/Theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ onFinish }) {
    const fadeLogo = useRef(new Animated.Value(0)).current;
    const scaleLogo = useRef(new Animated.Value(0.9)).current;
    const fadeTitle = useRef(new Animated.Value(0)).current;
    const fadeTagline = useRef(new Animated.Value(0)).current;
    const fadeScreen = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Animation Sequence
        Animated.sequence([
            // Logo fade in + scale
            Animated.parallel([
                Animated.timing(fadeLogo, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleLogo, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),
            // Title fade in
            Animated.timing(fadeTitle, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            // Tagline fade in
            Animated.timing(fadeTagline, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

        // Navigate after 2 seconds
        const timer = setTimeout(() => {
            Animated.timing(fadeScreen, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                if (onFinish) onFinish();
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: fadeScreen }]}>
            <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Background Illustration Placeholder (Low opacity) */}
                <View style={styles.illustrationContainer}>
                    <Image
                        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2996/2996025.png' }}
                        style={styles.illustration}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.content}>
                    <Animated.View style={{ opacity: fadeLogo, transform: [{ scale: scaleLogo }] }}>
                        <View style={styles.logoCircle}>
                            <Image
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3553/3553648.png' }}
                                style={styles.logoIcon}
                                resizeMode="contain"
                            />
                        </View>
                    </Animated.View>

                    <Animated.Text style={[styles.title, { opacity: fadeTitle }]}>
                        FarmEquipConnect
                    </Animated.Text>

                    <Animated.Text style={[styles.tagline, { opacity: fadeTagline }]}>
                        Empowering Smart Farming
                    </Animated.Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    illustrationContainer: {
        position: 'absolute',
        opacity: 0.03,
        width: width * 1.2,
        height: width * 1.2,
    },
    illustration: {
        width: '100%',
        height: '100%',
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    logoIcon: {
        width: 70,
        height: 70,
        tintColor: Colors.primary,
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: Colors.primary,
        letterSpacing: 1.5,
    },
    tagline: {
        fontSize: 18,
        color: '#64748B',
        marginTop: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
});
