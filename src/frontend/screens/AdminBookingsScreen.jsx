import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, ScrollView, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, Glass, Shadows, BorderRadius } from '../theme/Theme';
import { bookingService } from '../../backend/services/bookingService';
import { mockGpsService } from '../../backend/services/mockGpsService';
import { formatBookingDisplay, formatDuration } from '../../backend/utils/dateFormatting.js';

export default function AdminBookingsScreen() {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filterStatus, setFilterStatus] = React.useState('all');

    React.useEffect(() => {
        setLoading(true);
        const unsub = bookingService.subscribeAll(list => {
            setBookings(list);
            setLoading(false);
            mockGpsService.startTracking(list);
        });
        return () => unsub && unsub();
    }, []);

    const cancelBooking = async (bookingId) => {
        Alert.alert('Cancel Booking', 'This will calculate refunds and driver compensation. Proceed?', [
            { text: 'No' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const result = await bookingService.cancelBooking(bookingId);
                        let msg = 'Booking cancelled successfully.';
                        if (result.refundAmount > 0) {
                            msg += `\nRefund: ₹${result.refundAmount.toFixed(0)} (${Math.round(result.refundPercent * 100)}%)`;
                        }
                        if (result.driverCompensation > 0) {
                            msg += `\nDriver Compensation: ₹${result.driverCompensation}`;
                        }
                        Alert.alert('Success', msg);
                    } catch (e) {
                        Alert.alert('Error', e.message);
                    }
                }
            }
        ]);
    };

    const filteredBookings = filterStatus === 'all'
        ? bookings
        : bookings.filter(b => (b.bookingStatus || '').toLowerCase() === filterStatus);

    const renderItem = ({ item }) => {
        const isGroup = !!item.groupBookingId;
        const statusColors = {
            confirmed: Colors.success,
            completed: Colors.agriGreen,
            cancelled: Colors.error,
            delivered: '#3B82F6',
            active: '#10B981',
            dispatched: '#8B5CF6'
        };

        return (
            <View style={styles.bookingCard}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.machineName}>{item.machineName || 'Unknown Machine'}</Text>
                            {isGroup && (
                                <View style={styles.gpBadgeLarge}>
                                    <Ionicons name="people" size={10} color="#0369A1" />
                                    <Text style={styles.gpBadgeTextLarge}>GP RENTAL</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.ownerText}>By {item.ownerName || 'Unknown Owner'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: (statusColors[(item.bookingStatus || '').toLowerCase()] || Colors.gold) + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColors[(item.bookingStatus || '').toLowerCase()] || Colors.gold }]}>
                            {(item.bookingStatus || 'pending').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.infoText}>{formatBookingDisplay(item.rentalStartDate, item.rentalEndDate)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.infoText}>{formatDuration(item.rentalStartDate, item.rentalEndDate)}</Text>
                    </View>
                </View>

                <View style={styles.financeRow}>
                    <View>
                        <Text style={styles.financeLabel}>Total Amount</Text>
                        <Text style={styles.financeValue}>₹{item.totalAmount}</Text>
                    </View>
                    <View style={[styles.payBadge, { backgroundColor: item.paymentStatus === 'Paid' ? '#D1FAE5' : '#FEE2E2' }]}>
                        <Text style={[styles.payText, { color: item.paymentStatus === 'Paid' ? '#065F46' : '#991B1B' }]}>
                            {item.paymentStatus?.toUpperCase() || 'UNPAID'}
                        </Text>
                    </View>
                </View>

                {item.driverId && (
                    <View style={styles.driverSection}>
                        <Ionicons name="person-circle-outline" size={16} color={Colors.agriGreen} />
                        <Text style={styles.driverLabel}>Driver Assigned: </Text>
                        <Text style={styles.driverValue}>{item.driverId.substring(0, 8)}...</Text>
                    </View>
                )}

                {/* Media Section */}
                {(item.handoverPhotos?.length > 0 || item.returnPhotos?.length > 0) && (
                    <View style={styles.mediaContainer}>
                        <Text style={styles.mediaLabel}>Verification Media</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
                            {item.handoverPhotos?.map((url, idx) => (
                                <Image key={`h-${idx}`} source={{ uri: url }} style={styles.miniPhoto} />
                            ))}
                            {item.returnPhotos?.map((url, idx) => (
                                <Image key={`r-${idx}`} source={{ uri: url }} style={styles.miniPhoto} />
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    {['dispatched', 'active'].includes(item.bookingStatus?.toLowerCase()) && item.gpsStatus && (
                        <View style={[styles.gpsBadge, { backgroundColor: item.gpsStatus === 'SAFE' ? '#ECFDF5' : '#FFFBEB' }]}>
                            <Ionicons name="location" size={12} color={item.gpsStatus === 'SAFE' ? '#059669' : '#D97706'} />
                            <Text style={[styles.gpsText, { color: item.gpsStatus === 'SAFE' ? '#059669' : '#D97706' }]}>
                                GPS: {(item.gpsStatus || 'NO_SIGNAL').replace(/_/g, ' ')}
                            </Text>
                        </View>
                    )}

                    {!['cancelled', 'completed'].includes((item.bookingStatus || '').toLowerCase()) && (
                        <TouchableOpacity
                            style={styles.cancelAction}
                            onPress={() => cancelBooking(item.id)}
                        >
                            <Text style={styles.cancelActionText}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>All Bookings</Text>

                {/* Filter Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingRight: 20 }}>
                    {['all', 'confirmed', 'delivered', 'active', 'completed', 'cancelled'].map(status => (
                        <TouchableOpacity
                            key={status}
                            style={[styles.filterBtn, filterStatus === status && styles.filterBtnActive]}
                            onPress={() => setFilterStatus(status)}
                        >
                            <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
                                {status.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {loading ? (
                    <ActivityIndicator color={Colors.navy} />
                ) : filteredBookings.length === 0 ? (
                    <Text style={styles.emptyText}>No bookings found</Text>
                ) : (
                    <FlatList
                        data={filteredBookings}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: Spacing.m },
    title: { fontSize: 24, fontWeight: '900', color: Colors.agriGreen, marginBottom: Spacing.l },
    filterRow: { marginBottom: Spacing.m, flexDirection: 'row' },
    filterBtn: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
    filterBtnActive: { backgroundColor: Colors.agriGreen, borderColor: Colors.agriGreen },
    filterText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800' },
    filterTextActive: { color: '#FFF' },
    bookingCard: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: BorderRadius.m,
        marginBottom: 16,
        ...Shadows.soft,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    machineName: { fontSize: 16, fontWeight: '800', color: Colors.navy },
    ownerText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    groupPointer: { backgroundColor: '#F0F9FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    groupPointerText: { fontSize: 9, fontWeight: '900', color: '#0369A1' },
    gpBadgeLarge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD' },
    gpBadgeTextLarge: { fontSize: 10, fontWeight: '900', color: '#0369A1', letterSpacing: 0.5 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },
    infoRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
    financeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginBottom: 12 },
    financeLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
    financeValue: { fontSize: 16, fontWeight: '900', color: Colors.agriGreen, marginTop: 2 },
    payBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    payText: { fontSize: 10, fontWeight: '800' },
    driverSection: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    driverLabel: { fontSize: 12, color: Colors.textSecondary },
    driverValue: { fontSize: 12, fontWeight: '700', color: Colors.navy },
    mediaContainer: { marginBottom: 12 },
    mediaLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', marginBottom: 6 },
    mediaRow: { flexDirection: 'row', gap: 8 },
    miniPhoto: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#F1F5F9' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    gpsText: { fontSize: 11, fontWeight: '800' },
    cancelAction: { paddingVertical: 4, paddingHorizontal: 8 },
    cancelActionText: { color: Colors.error, fontSize: 12, fontWeight: '700' },
    emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 15, fontWeight: '600' },
});

