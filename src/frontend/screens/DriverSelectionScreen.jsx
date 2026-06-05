import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../../backend/services/AuthContext';
import { driverService } from '../../backend/services/driverService';
import { bookingService } from '../../backend/services/bookingService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../backend/firebase/config';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';

export default function DriverSelectionScreen({ route, navigation }) {
    const { bookingId, district, machineType: initialMachineType, isSelectionMode = false } = route.params || {};
    const { user } = useAuth();
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [machineType, setMachineType] = useState(initialMachineType);
    const [fallbackMode, setFallbackMode] = useState(null); // 'all_areas' or 'all_capabilities'

    useEffect(() => {
        loadDrivers();
    }, []);

    const loadDrivers = async () => {
        setLoading(true);
        try {
            // 1. Try local + machine type
            let list = await driverService.getByDistrict(district || '', machineType);
            
            // 2. If no local, try ALL areas but keep machine type filter
            if (list.length === 0) {
                console.log('No local drivers, trying all areas with type:', machineType);
                let allDrivers = await driverService.getAll();
                let available = allDrivers.filter(d => d.availability !== false);
                
                if (machineType) {
                    const m = machineType.toLowerCase();
                    list = available.filter(d => 
                        (d.capabilities || []).some(cap => cap.toLowerCase().includes(m))
                    );
                } else {
                    list = available;
                }
                if (list.length > 0) setFallbackMode('all_areas');
            }

            // 3. Last Resort: If STILL no drivers (maybe machine type is too niche), show ALL available drivers
            if (list.length === 0) {
                console.log('No drivers found with type filter, showing all available');
                let allDrivers = await driverService.getAll();
                list = allDrivers.filter(d => d.availability !== false);
                if (list.length > 0) setFallbackMode('all_capabilities');
            }

            setDrivers(list);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Could not load operators.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (driver) => {
        if (isSelectionMode) {
            const gotMachineId = route.params?.machineId || route.params?.bookingId;

            if (route.params?.onOperatorSelected) {
                route.params.onOperatorSelected(driver);
                navigation.goBack();
                return;
            }

            // fallback path for older behavior (preserve machineId when possible)
            if (gotMachineId) {
                navigation.navigate('MachineDetail', {
                    selectedDriver: driver,
                    machineId: gotMachineId,
                });
            } else {
                Alert.alert('Info', 'Operator selected. Returning to dashboard.', [
                    { text: 'OK', onPress: () => navigation.navigate('MyOrders') }
                ]);
            }
            return;
        }

        Alert.alert(
            'Assign Operator',
            `Assign "${driver.name}" to this booking?`,
            [
                { text: 'Cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setAssigning(true);
                        try {
                            await bookingService.updateBooking(bookingId, {
                                targetOperators: [driver.id],
                                operatorMode: 'single_target',
                                driverId: null,
                                driverStatus: 'pending_driver_accept',
                            });
                            Alert.alert(
                                '✅ Operator Requested',
                                `${driver.name} has been notified of this job. They will accept or reject.`,
                                [{ text: 'OK', onPress: () => navigation.navigate('MyOrders') }]
                            );
                        } catch (e) {
                            Alert.alert('Error', 'Could not assign driver: ' + e.message);
                        } finally {
                            setAssigning(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSkip = () => {
        if (isSelectionMode) {
            if (route.params?.onOperatorSelected) {
                route.params.onOperatorSelected(null);
                navigation.goBack();
                return;
            }
            navigation.navigate('MachineDetail', { selectedDriver: null, machineId: route.params?.machineId || null });
            return;
        }
        Alert.alert(
            'Skip Operator?',
            'You can hire a driver later from your bookings.',
            [
                { text: 'Cancel' },
                { text: 'Skip', onPress: () => navigation.navigate('MyOrders') }
            ]
        );
    };

    const renderDriver = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.name || 'D')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.m }}>
                    <Text style={styles.driverName}>{item.name}</Text>
                    <Text style={styles.driverDistrict}>📍 {item.district || 'Unknown area'}</Text>
                    <Text style={styles.operatorSpecial}>🛠️ {item.speciality || (item.capabilities?.length ? item.capabilities.join(', ') : 'General operator')}</Text>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color={Colors.gold} />
                        <Text style={styles.ratingNum}>{item.rating || 'New'}</Text>
                        <Text style={styles.totalJobs}> · {item.totalJobs || 0} jobs</Text>
                    </View>
                    <View style={styles.capRow}>
                        {(item.capabilities || []).map(cap => (
                            <View key={cap} style={styles.capTag}>
                                <Text style={styles.capTagText}>{cap}</Text>
                            </View>
                        ))}
                    </View>
                </View>
                <View style={[styles.badge, item.availability ? styles.badgeGreen : styles.badgeGrey]}>
                    <Text style={styles.badgeText}>{item.availability ? 'Free' : 'Busy'}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.selectBtn, !item.availability && styles.selectBtnDisabled]}
                onPress={() => item.availability && handleSelect(item)}
                disabled={!item.availability || assigning}
            >
                {assigning
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.selectBtnText}>
                        {item.availability ? 'Select This Operator' : 'Unavailable'}
                    </Text>
                }
            </TouchableOpacity>
        </View>
    );

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color={Colors.white} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Select an Operator</Text>
                    <Text style={styles.headerSub}>
                        {fallbackMode === 'all_capabilities' ? 'Showing all available operators' :
                         fallbackMode === 'all_areas' ? `All available ${machineType || ''} operators` :
                         `Operators in ${district || 'your area'}`}
                    </Text>
                </View>
            </View>

            {fallbackMode && (
                <View style={[styles.infoBar, { backgroundColor: fallbackMode === 'all_capabilities' ? '#FEF2F2' : '#EFF6FF' }]}>
                    <Ionicons 
                        name={fallbackMode === 'all_capabilities' ? "alert-circle" : "information-circle"} 
                        size={16} 
                        color={fallbackMode === 'all_capabilities' ? Colors.error : '#1D4ED8'} 
                    />
                    <Text style={[styles.infoBarText, { color: fallbackMode === 'all_capabilities' ? Colors.error : '#1D4ED8' }]}>
                        {fallbackMode === 'all_capabilities' 
                            ? `No specialized operators found for ${machineType}. Showing general operators.`
                            : `No operators found in ${district}. Showing from other areas.`}
                    </Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator color={Colors.navy} size="large" style={{ marginTop: 50 }} />
            ) : drivers.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🚗</Text>
                    <Text style={styles.emptyTitle}>No Operators Available</Text>
                    <Text style={styles.emptySub}>No operators found for this area. You can proceed without one.</Text>
                </View>
            ) : (
                <FlatList
                    data={drivers}
                    keyExtractor={d => d.id}
                    renderItem={renderDriver}
                    contentContainerStyle={{ padding: Spacing.m, paddingBottom: 100 }}
                />
            )}

            {/* Skip button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipBtnText}>Skip — Book Without Operator</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: Colors.agriGreen, padding: Spacing.m, paddingTop: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.l, borderBottomRightRadius: BorderRadius.l,
        flexDirection: 'row', alignItems: 'center', gap: 12
    },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: Colors.white, fontSize: 20, fontWeight: '900' },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
    infoBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, margin: Spacing.m, marginBottom: 0, borderRadius: 8 },
    infoBarText: { fontSize: 11, fontWeight: '700', flex: 1 },

    card: {
        backgroundColor: Colors.white, borderRadius: BorderRadius.m,
        padding: Spacing.m, marginBottom: Spacing.m, ...Shadows.soft,
        borderLeftWidth: 4, borderLeftColor: Colors.agriGreen
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.m },
    avatar: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#E2E8F0'
    },
    avatarText: { color: Colors.agriGreen, fontSize: 22, fontWeight: '900' },
    driverName: { fontSize: 17, fontWeight: '800', color: Colors.navy },
    driverDistrict: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    operatorSpecial: { fontSize: 12, color: Colors.agriEarth, marginTop: 3, fontWeight: '700' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    ratingNum: { fontSize: 13, fontWeight: '800', color: Colors.navy },
    totalJobs: { fontSize: 12, color: Colors.textSecondary },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeGreen: { backgroundColor: '#D1FAE5' },
    badgeGrey: { backgroundColor: '#F3F4F6' },
    badgeText: { fontSize: 10, fontWeight: '900', color: Colors.navy, textTransform: 'uppercase' },
    selectBtn: {
        backgroundColor: Colors.agriGreen, paddingVertical: 12,
        borderRadius: BorderRadius.m, alignItems: 'center', ...Shadows.soft
    },
    selectBtnDisabled: { backgroundColor: '#CBD5E1', elevation: 0 },
    selectBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    emptyIcon: { fontSize: 60, marginBottom: Spacing.m },
    emptyTitle: { fontSize: 22, fontWeight: '900', color: Colors.navy },
    emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 20 },
    footer: {
        backgroundColor: '#fff', padding: Spacing.m, paddingBottom: 30,
        borderTopWidth: 1, borderTopColor: '#F1F5F9',
    },
    skipBtn: {
        paddingVertical: 14, borderRadius: BorderRadius.m, alignItems: 'center',
        backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0'
    },
    skipBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 15 },
    capRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
    capTag: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#DCFCE7' },
    capTagText: { fontSize: 10, color: '#166534', fontWeight: '800' },
});

