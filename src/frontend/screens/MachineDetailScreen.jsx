import React, { useEffect, useState } from 'react';
import {
    View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../../backend/services/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';
import BookingModal from '../components/BookingModal';
import { bookingService } from '../../backend/services/bookingService';
import { machineService } from '../../backend/services/machineService';
import { Platform } from 'react-native';
import { safeAlert } from '../utils/safeAlert';
import * as Location from 'expo-location';

export default function MachineDetailScreen({ route, navigation }) {
    const { machineId, userCoords, isNearby } = route.params || {};
    const { user } = useAuth();
    const [machine, setMachine] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [needDriver, setNeedDriver] = useState(false);
    const [duration, setDuration] = useState('1');
    const [selectedDriver, setSelectedDriver] = useState(null);

    const [coords, setCoords] = useState(userCoords);

    useEffect(() => {
        if (machineId) {
            loadMachine();
        } else {
            setLoading(false);
        }
    }, [machineId]);

    useEffect(() => {
        const selected = route.params?.selectedDriver;
        const paramMachineId = route.params?.machineId;

        if (selected !== undefined && selected !== null) {
            setSelectedDriver(selected);
        }

        if (!machineId && paramMachineId) {
            // if we were navigated from DriverSelection fallback path without persistent machineId
            navigation.setParams({ machineId: paramMachineId });
        }
    }, [route.params?.selectedDriver, route.params?.machineId]);

    // GPS Fallback: If 'Nearby' was on but coords are missing, try one last time.
    useEffect(() => {
        if (isNearby && !coords) {
            (async () => {
                try {
                    let { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc && loc.coords) {
                            setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                        }
                    }
                } catch (e) { console.log('MachineDetail Location Fallback Failed:', e); }
            })();
        }
    }, [isNearby, coords]);

    const loadMachine = async () => {
        try {
            const data = await machineService.getById(machineId);
            setMachine(data || null);
        } catch (err) {
            safeAlert('Error', 'Unable to load machine details.');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotalAmount = () => {
        if (!machine) return 0;
        const hourlyRate = machine.basePay || machine.rate || 0;
        const driverFee = needDriver ? 200 : 0;
        return (hourlyRate + driverFee) * (Number(duration) || 1);
    };

    const handleBook = () => {
        if (!user) { safeAlert('Login Required', 'Please login to book a machine.'); return; }
        setShowBookingModal(true);
    };

    const processBooking = async ({ rentalStartDate, rentalEndDate, timeSlot, totalDays, totalAmount, boundary }) => {
        setShowBookingModal(false);
        setBookingLoading(true);
        try {
            // breakdown payment
            const machineRate = machine.basePay || machine.rate || 0;
            const machineAmount = machineRate * totalDays;
            const driverAmount = needDriver ? 200 * totalDays : 0;
            const platformFee = Math.round((machineAmount + driverAmount) * 0.05); // 5% platform fee
            const totalAmt = machineAmount + driverAmount + platformFee;

            // Create booking in Firestore first (status: pending, payment: pending)
            const bookingId = await bookingService.createBooking({
                machineId,
                machineName: machine.name,
                machineImage: machine.imageUrl || machine.machineImage || '',
                ownerId: machine.ownerId,
                ownerName: machine.ownerName || machine.owner || '',
                borrowerId: user.uid,
                borrowerName: user.displayName || user.phoneNumber || user.email || '',
                rentalStartDate,
                rentalEndDate,
                timeSlot,
                totalDays,
                machineAmount,
                driverAmount,
                platformFee,
                totalAmount: totalAmt,
                needDriver,
                operatorMode: selectedDriver ? 'single_target' : 'broadcast',
                targetOperators: selectedDriver ? [selectedDriver.id] : [],
                driverId: null,
                driverStatus: needDriver ? 'pending_driver_accept' : null,
                paymentStatus: 'pending',
                bookingStatus: 'pending',
                boundary: boundary || null,
            });

            setBookingLoading(false);

            // Navigate to Razorpay checkout — that screen handles all payment state updates
            navigation.navigate('PaymentWebView', {
                bookingId,
                amount: totalAmt,
                machineName: machine.name,
                borrowerName: user.displayName || user.phoneNumber || user.email || '',
                borrowerPhone: user.phoneNumber || '',
                needDriver,
                district: machine.location?.district || '',
            });

        } catch (e) {
            safeAlert('Booking Error', 'Could not create booking: ' + (e.message || e));
            setBookingLoading(false);
        }
    };

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator color={Colors.gold} size="large" /></View>;
    if (!machine) return <View style={styles.loadingContainer}><Text>Machine not found</Text></View>;

    const totalPrice = calculateTotalAmount();

    return (
        <>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

                    {/* Hero */}
                    <View style={styles.heroContainer}>
                        <View style={styles.heroBlurBg}>
                            <View style={styles.heroOverlay} />
                            <Image source={{ uri: machine.imageUrl }} style={styles.heroImageMain} resizeMode="contain" />
                        </View>
                        <View style={styles.headerBar}>
                            <TouchableOpacity style={styles.roundBtn} onPress={() => navigation.goBack()}>
                                <Ionicons name="arrow-back" size={24} color={Colors.navy} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Content */}
                    <View style={styles.contentContainer}>

                        {/* Title */}
                        <View style={styles.titleSection}>
                            <View style={styles.badgeRow}>
                                <Text style={styles.categoryBadge}>{(machine.type || '').toUpperCase()}</Text>
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color="#1976D2" style={{ marginRight: 4 }} />
                                    <Text style={styles.verifiedText}>VERIFIED</Text>
                                </View>
                            </View>
                            <Text style={styles.title}>{machine.name}</Text>
                            <View style={styles.ratingRow}>
                                <Ionicons name="star" size={14} color={Colors.gold} />
                                <Text style={styles.rating}>4.8</Text>
                                <Text style={styles.dot}>•</Text>
                                {machine.location && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="location-outline" size={14} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                                        <Text style={styles.location}>
                                            {machine.location.village || machine.location.district}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Pricing */}
                        <View style={styles.pricingCard}>
                            <Text style={styles.priceLabel}>Base Rate</Text>
                            <Text style={styles.price}>₹{machine.basePay || machine.rate} / hour</Text>
                            {needDriver && <Text style={styles.driverFee}>+ ₹200/hr (Operator fee)</Text>}
                        </View>

                        {/* Specs */}
                        <View style={styles.specsRow}>
                            <SpecItem label="Power" value="50 HP" icon="flash-outline" />
                            <SpecItem label="Fuel" value="Diesel" icon="water-outline" />
                            <SpecItem label="Drive" value="4WD" icon="cog-outline" />
                            <SpecItem label="Year" value="2022" icon="calendar-outline" />
                        </View>

                        <View style={styles.divider} />

                        {/* Description */}
                        <Text style={styles.sectionHeader}>Description</Text>
                        <Text style={styles.description}>
                            {machine.description || 'Top-rated agricultural machinery suitable for all soil types.'}
                        </Text>

                        {/* Expert Operator Toggle */}
                        <TouchableOpacity
                            style={[styles.toggleCard, needDriver && styles.toggleCardActive]}
                            onPress={() => setNeedDriver(!needDriver)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.toggleInfo}>
                                <Text style={styles.toggleLabel}>Expert Operator</Text>
                                <Text style={styles.toggleSub}>+₹200/hr for professional operation</Text>
                            </View>
                            <View style={[styles.switch, needDriver && styles.switchActive]}>
                                <View style={[styles.switchKnob, needDriver && styles.switchKnobActive]} />
                            </View>
                        </TouchableOpacity>

                        {/* Expert Driver Selection Button */}
                        {needDriver && (
                            <TouchableOpacity
                                style={[styles.selectDriverBtn, selectedDriver && styles.selectDriverBtnActive]}
                                onPress={() => navigation.navigate('DriverSelection', {
                                    isSelectionMode: true,
                                    machineId,
                                    district: machine.location?.district,
                                    machineType: machine.type,
                                    onOperatorSelected: (operator) => setSelectedDriver(operator)
                                })}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.selectDriverLabel}>
                                        {selectedDriver ? 'Selected Operator' : 'Choose an Operator'}
                                    </Text>
                                    <Text style={styles.selectDriverSub}>
                                        {selectedDriver ? `${selectedDriver.name} (${selectedDriver.rating || 'New'}⭐) • ${selectedDriver.district || 'Unknown'} • ${selectedDriver.speciality || (selectedDriver.capabilities?.join(', ') || 'General')}` : 'Click to see available operators'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        )}

                        {/* Duration */}
                        <View style={styles.durationCard}>
                            <View style={styles.toggleInfo}>
                                <Text style={styles.toggleLabel}>Rental Duration (Hours)</Text>
                            </View>
                            <TextInput
                                style={styles.durationInput}
                                value={duration}
                                onChangeText={setDuration}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                            <Text style={styles.unitText}>Hrs</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Sticky Footer */}
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerLabel}>Total Estimate</Text>
                        <Text style={styles.footerPrice}>₹ {totalPrice}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.bookBtn, (machine.isAvailable === false || bookingLoading) && { backgroundColor: '#ccc' }]}
                        onPress={handleBook}
                        disabled={bookingLoading || machine.isAvailable === false}
                    >
                        {bookingLoading
                            ? <ActivityIndicator color={Colors.white} />
                            : <Text style={styles.bookBtnText}>
                                {machine.isAvailable === false ? 'Unavailable' : 'Book Now'}
                            </Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>

            <BookingModal
                visible={showBookingModal}
                onClose={() => setShowBookingModal(false)}
                machine={machine}
                onConfirm={processBooking}
                prefillCoords={coords || userCoords}
                isNearby={isNearby}
                needDriver={needDriver}
            />
        </>
    );
}

function SpecItem({ label, value, icon }) {
    return (
        <View style={styles.specItem}>
            <View style={styles.iconCircle}>
                <Ionicons name={icon} size={20} color={Colors.navy} />
            </View>
            <Text style={styles.specVal}>{value}</Text>
            <Text style={styles.specLbl}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heroContainer: { height: 300, width: '100%', position: 'relative' },
    heroBlurBg: { width: '100%', height: '100%' },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
    heroImageMain: { width: '100%', height: '100%', zIndex: 2 },
    headerBar: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
    roundBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center', alignItems: 'center', ...Shadows.soft,
    },
    iconText: { fontSize: 18, fontWeight: 'bold', color: Colors.navy },
    contentContainer: {
        marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        backgroundColor: '#FFFFFF', padding: Spacing.l, paddingBottom: 40, ...Shadows.strong,
    },
    titleSection: { marginBottom: Spacing.m },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    categoryBadge: { fontSize: 10, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 1, marginRight: 10 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    verifiedText: { fontSize: 10, fontWeight: 'bold', color: '#1976D2' },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.navy, marginBottom: 4 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rating: { fontSize: 14, fontWeight: 'bold', color: Colors.gold },
    dot: { color: Colors.textSecondary },
    location: { fontSize: 14, color: Colors.textSecondary },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: Spacing.l },
    pricingCard: { marginBottom: Spacing.m },
    priceLabel: { fontSize: 12, color: Colors.textSecondary },
    price: { fontSize: 22, fontWeight: '800', color: Colors.navy },
    driverFee: { fontSize: 13, color: Colors.gold, fontWeight: '600', marginTop: 2 },
    specsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.m },
    specItem: { alignItems: 'center', width: '22%' },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    specVal: { fontSize: 13, fontWeight: 'bold', color: Colors.navy },
    specLbl: { fontSize: 10, color: Colors.textSecondary },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', color: Colors.navy, marginBottom: Spacing.s },
    description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.l },
    toggleCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.soft
    },
    toggleCardActive: { borderColor: Colors.gold, backgroundColor: '#FFFCF5' },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.navy },
    toggleSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    switch: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2 },
    switchActive: { backgroundColor: Colors.navy },
    switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
    switchKnobActive: { alignSelf: 'flex-end' },
    durationCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.soft,
    },
    durationInput: {
        width: 56, height: 40, borderWidth: 1, borderColor: Colors.navy,
        borderRadius: 8, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: Colors.navy,
    },
    unitText: { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF',
        padding: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9',
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 20,
    },
    footerLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
    footerPrice: { fontSize: 22, fontWeight: 'bold', color: Colors.navy },
    bookBtn: { backgroundColor: Colors.navy, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 28, ...Shadows.soft },
    bookBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
    selectDriverBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        padding: 14, borderRadius: 12, marginBottom: Spacing.m,
        borderWidth: 1, borderColor: '#E2E8F0', ...Shadows.soft,
    },
    selectDriverBtnActive: { borderColor: Colors.navy, backgroundColor: '#F0F9FF' },
    selectDriverLabel: { fontSize: 14, fontWeight: '700', color: Colors.navy },
    selectDriverSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    chevronIcon: { fontSize: 18, color: Colors.textSecondary, fontWeight: 'bold' },
});

