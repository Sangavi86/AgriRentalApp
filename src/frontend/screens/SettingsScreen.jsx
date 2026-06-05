import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useConfig } from '../../backend/services/ConfigContext';
import { Colors, Spacing, FontSize, BorderRadius, Glass, Shadows } from '../theme/Theme';

export default function SettingsScreen({ navigation }) {
    const { config, updateConfig, resetConfig } = useConfig();

    const renderSettingItem = (label, value, key, icon) => (
        <View style={styles.field}>
            <View style={styles.labelRow}>
                <Ionicons name={icon} size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.label}>{label}</Text>
            </View>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={(t) => updateConfig(key, t)}
                placeholder="https://..."
                placeholderTextColor={Colors.greyMedium}
                multiline
            />
            {value && value.startsWith('http') && (
                <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>Preview:</Text>
                    <Image source={{ uri: value }} style={styles.previewImage} />
                </View>
            )}
        </View>
    );

    return (
        <ScreenWrapper noPadding>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>App Settings</Text>
                </View>

                <View style={styles.content}>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Background Customization</Text>
                        <Text style={styles.cardSubtitle}>Paste image URLs to change screen backgrounds</Text>

                        {renderSettingItem('Login Screen Background', config.bgLogin, 'bgLogin', 'log-in-outline')}
                        {renderSettingItem('Farmer Home Background', config.bgFarmerHome, 'bgFarmerHome', 'leaf-outline')}
                        {renderSettingItem('Driver Home Background', config.bgDriverHome, 'bgDriverHome', 'car-outline')}
                        {renderSettingItem('OTP Screen Background', config.bgOtp, 'bgOtp', 'key-outline')}

                        <View style={styles.divider} />

                        <View style={styles.actions}>
                            <TouchableOpacity style={styles.resetBtn} onPress={resetConfig}>
                                <Ionicons name="refresh-outline" size={18} color={Colors.error} style={{ marginRight: 8 }} />
                                <Text style={styles.resetText}>Reset to Default</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
                                <Text style={styles.doneText}>Save & Exit</Text>
                                <Ionicons name="checkmark-done" size={18} color={Colors.white} style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: { flexGrow: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.l,
        backgroundColor: Colors.primary,
        paddingTop: 50,
    },
    backBtn: { marginRight: 15 },
    headerTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
    content: { padding: Spacing.m },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: Spacing.l,
        ...Shadows.medium,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 25,
    },
    field: { marginBottom: 20 },
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
    input: {
        backgroundColor: Colors.greyBg,
        borderRadius: 12,
        padding: 12,
        fontSize: 12,
        color: Colors.textPrimary,
        minHeight: 50,
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    previewContainer: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewLabel: { fontSize: 10, color: Colors.textSecondary, marginRight: 10 },
    previewImage: {
        width: 80,
        height: 45,
        borderRadius: 6,
        backgroundColor: Colors.greyBg,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.accent,
        marginVertical: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    resetText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
    doneBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        ...Shadows.soft,
    },
    doneText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
});

