import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Platform
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';
import { useAuth } from '../../backend/services/AuthContext';
import { groupService } from '../../backend/services/groupService';
import { groupBookingService } from '../../backend/services/groupBookingService';
import StatusBadge from '../components/StatusBadge';
import { Ionicons } from '@expo/vector-icons';

const GPS_STATUS_COLORS = {
    SAFE: '#10B981',
    NEAR_BOUNDARY: '#F59E0B',
    OUT_OF_RANGE: '#EF4444',
    ALERT: '#DC2626',
    NO_SIGNAL: '#6B7280',
    INACTIVE: '#9CA3AF',
    ERROR: '#EF4444',
};

const STATUS_FLOW = ['gathering_requests', 'scheduling', 'waiting_payment', 'confirmed', 'delivered', 'active', 'completed', 'cancelled'];
const STATUS_LABELS = {
    gathering_requests: 'Gathering Requests',
    scheduling: 'Scheduling Slots',
    waiting_payment: 'Waiting for Payment',
    confirmed: 'Waiting For Dispatch',
    delivered: 'Machine Delivered',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled'
};

export default function GroupBookingScreen({ route, navigation }) {
    const { bookingId } = route.params;
    const { user } = useAuth();
    
    const [booking, setBooking] = useState(null);
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [requestedHours, setRequestedHours] = useState('');
    // Track allMembersPaid to show notification exactly once when it becomes true
    const allPaidNotifiedRef = useRef(false);

    useEffect(() => {
        // Real-time listener for booking updates
        const unsub = groupBookingService.subscribeGPBooking(bookingId, async (b) => {
            setBooking(b);
            if (b && b.groupId) {
                try {
                    const g = await groupService.getGroup(b.groupId);
                    setGroup(g);
                } catch (e) {
                    console.error('Failed to load group:', e);
                }
            }
            // Show one-time notification when all members have paid
            if (b && b.allMembersPaid && !allPaidNotifiedRef.current) {
                allPaidNotifiedRef.current = true;
                Alert.alert(
                    '🎉 All Members Paid!',
                    'Everyone has paid their share. The leader can now confirm and lock the machine.'
                );
            }
            setLoading(false);
        });
        return () => unsub && unsub();
    }, [bookingId]);

    const isLeader = group?.leaderId === user?.uid;
    const isMember = group?.members?.includes(user?.uid);

    // ── Member: Request hours ──
    const handleRequestHours = async () => {
        if (!requestedHours) {
            Alert.alert('Missing Info', 'Please enter how many hours you need.');
            return;
        }

        if (!isMember) {
            Alert.alert('Not a member', 'Only group members can request usage time.');
            return;
        }

        if (booking.status !== 'gathering_requests') {
            Alert.alert('Not accepting requests', 'This booking is no longer collecting timing requests.');
            return;
        }

        const hours = Number(requestedHours);
        if (!Number.isFinite(hours) || hours <= 0) {
            Alert.alert('Invalid Hours', 'Please enter a positive number of hours.');
            return;
        }
        if (hours > 24) {
            Alert.alert(
                'Invalid Hours',
                'Max allowed hours is 24\nPlease enter valid duration'
            );
            return;
        }

        const currentTotal = (booking.timingRequests || [])
            .filter(r => r.farmerId !== user.uid)
            .reduce((sum, r) => sum + (r.requestedHours || 0), 0);

        const remaining = booking.totalDuration - currentTotal;
        if (hours > remaining) {
            Alert.alert(
                'Exceeds Available Hours',
                `Only ${remaining} hour${remaining === 1 ? '' : 's'} remaining for this machine. Please enter ${remaining} or less.`
            );
            return;
        }

        setActionLoading(true);
        try {
            await groupBookingService.requestTiming(bookingId, user.uid, hours);
            Alert.alert('✅ Success', 'Usage request submitted.');
            setRequestedHours('');
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Leader: Move to scheduling ──
    const handleMoveToScheduling = async () => {
        setActionLoading(true);
        try {
            await groupBookingService.moveToScheduling(bookingId, user.uid);
            Alert.alert('✅ Ready', 'Booking moved to scheduling. You can now finalize slots.');
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Leader: Finalize schedule ──
    const handleFinalizeSchedule = async () => {
        if (booking.status !== 'scheduling') {
            Alert.alert('Wrong stage', 'Move this booking to Scheduling before finalizing slots.');
            return;
        }
        setActionLoading(true);
        try {
            // Auto-generate continuous slots starting from 8 AM
            let currentHour = 8;
            const slots = (booking.timingRequests || []).map((req) => {
                const startHour = currentHour;
                const endHour = startHour + req.requestedHours;
                currentHour = endHour;
                return {
                    farmerId: req.farmerId,
                    hours: req.requestedHours,
                    startTime: `${String(startHour).padStart(2, '0')}:00`,
                    endTime: `${String(endHour).padStart(2, '0')}:00`,
                };
            });
            await groupBookingService.finalizeSchedule(bookingId, slots, user.uid);
            Alert.alert('✅ Success', 'Schedule finalized and payment split created.');
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Member: Pay share — navigate to checkout screen ──
    const handlePayShare = () => {
        const myPayment = booking.payments?.find(p => p.farmerId === user.uid);
        if (!myPayment) {
            Alert.alert('Error', 'No payment record found for your account.');
            return;
        }
        if (myPayment.paid) {
            Alert.alert('Already Paid', 'You have already paid your share for this booking.');
            return;
        }
        // Payment is fully handled inside PaymentWebViewScreen
        navigation.navigate('PaymentWebView', {
            bookingId,
            amount: myPayment.amount,
            machineName: booking.machineName,
            borrowerName: user.displayName || user.uid,
            borrowerPhone: user.phoneNumber || '',
            isGroupPayment: true,
        });
    };

    // ── Leader: Confirm booking ──
    const handleConfirmBooking = async () => {
        setActionLoading(true);
        try {
            await groupBookingService.confirmGPBooking(bookingId);
            const msg = '✅ Confirmed! Group Booking is now locked and the driver has been notified.';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('✅ Confirmed', msg);
        } catch (e) {
            console.error('Confirm GP Error:', e);
            const errMsg = e.message || 'Confirmation failed. Machine might have been booked by someone else.';
            if (Platform.OS === 'web') window.alert('Error: ' + errMsg);
            else Alert.alert('Error', errMsg);
        } finally {
            setActionLoading(false);
        }
    };

    // ── Leader: Cancel booking ──
    const handleCancelBooking = () => {
        const doCancel = async () => {
            setActionLoading(true);
            try {
                await groupBookingService.cancelGPBooking(bookingId);
                if (Platform.OS === 'web') window.alert('Group booking cancelled. Refunds processed.');
                else Alert.alert('❌ Cancelled', 'Group booking has been cancelled. Refunds processed.');
                navigation.goBack();
            } catch (e) {
                if (Platform.OS === 'web') window.alert('Error: ' + e.message);
                else Alert.alert('Error', e.message);
            } finally {
                setActionLoading(false);
            }
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Cancel Group Booking?\n\nPaid members will be refunded.')) doCancel();
        } else {
            Alert.alert('Cancel Group Booking', 'Are you sure? Paid members will be refunded.', [
                { text: 'No', style: 'cancel' },
                { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel }
            ]);
        }
    };

    // ── GP Lifecycle handlers ──
    const handleReceiveGP = async () => {
        setActionLoading(true);
        try {
            await groupBookingService.receiveGPMachine(bookingId);
            if (Platform.OS === 'web') window.alert('Machine received! Status: Delivered');
            else Alert.alert('✅ Received', 'Machine received successfully.');
        } catch (e) {
            if (Platform.OS === 'web') window.alert('Error: ' + e.message);
            else Alert.alert('Error', e.message);
        } finally { setActionLoading(false); }
    };

    const handleStartGP = async () => {
        setActionLoading(true);
        try {
            await groupBookingService.startGPBooking(bookingId);
            if (Platform.OS === 'web') window.alert('Work started! GPS tracking active.');
            else Alert.alert('🚜 Active', 'Work started. GPS tracking is now active.');
        } catch (e) {
            if (Platform.OS === 'web') window.alert('Error: ' + e.message);
            else Alert.alert('Error', e.message);
        } finally { setActionLoading(false); }
    };

    const handleReturnGP = async () => {
        setActionLoading(true);
        try {
            await groupBookingService.returnGPMachine(bookingId);
            if (Platform.OS === 'web') window.alert('Machine returned! Booking complete.');
            else Alert.alert('🏁 Complete', 'Machine returned. Booking completed.');
        } catch (e) {
            if (Platform.OS === 'web') window.alert('Error: ' + e.message);
            else Alert.alert('Error', e.message);
        } finally { setActionLoading(false); }
    };

    if (loading) return <ScreenWrapper><ActivityIndicator size="large" color={Colors.navy} style={{ marginTop: 40 }} /></ScreenWrapper>;
    if (!booking) return <ScreenWrapper><Text style={{ padding: 20 }}>Booking not found</Text></ScreenWrapper>;

    const myPayment = booking.payments?.find(p => p.farmerId === user.uid);
    const allPaid = booking.payments?.every(p => p.paid);
    const paidCount = booking.payments?.filter(p => p.paid).length || 0;
    const totalCount = booking.payments?.length || 0;
    const remainingHours = booking.totalDuration - (booking.timingRequests || []).reduce((s, r) => s + (r.requestedHours || 0), 0);

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.groupName}>{group?.name}</Text>
                    <Text style={styles.machineName}>{booking.machineName}</Text>
                    <StatusBadge type="booking" status={booking.status} />
                    <Text style={[
                        styles.statusLabel,
                        booking.allMembersPaid && booking.status === 'waiting_payment' && { color: Colors.success, fontWeight: '800' }
                    ]}>
                        {booking.allMembersPaid && booking.status === 'waiting_payment' 
                            ? '✅ READY TO CONFIRM' 
                            : (booking.status === 'confirmed' ? '✅ BOOKED - WAITING FOR DISPATCH' : (STATUS_LABELS[booking.status] || booking.status))}
                    </Text>
                </View>

                {/* Booking Details */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Booking Details</Text>
                    <Text style={styles.detail}>📅 Date: {booking.bookingDate}</Text>
                    <Text style={styles.detail}>⏰ Total Duration: {booking.totalDuration} hours</Text>
                    <Text style={styles.detail}>💰 Rate: ₹{booking.baseHourlyRate}/hr</Text>
                    <Text style={styles.detail}>💵 Total Cost: ₹{booking.totalDuration * booking.baseHourlyRate}</Text>
                    {booking.startTime && <Text style={styles.detail}>🕐 Schedule: {booking.startTime} - {booking.endTime}</Text>}
                </View>

                {/* Member View: Request Timing */}
                {booking.status === 'gathering_requests' && isMember && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Request Usage Time</Text>
                        <Text style={styles.helpText}>
                            {remainingHours > 0 
                                ? `${remainingHours} hours still available for this machine.` 
                                : 'All hours have been requested.'}
                        </Text>
                        {remainingHours > 0 && (
                            <>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`Hours needed (max 24)`}
                                    value={requestedHours}
                                    onChangeText={setRequestedHours}
                                    keyboardType="number-pad"
                                />
                                <TouchableOpacity 
                                    style={styles.primaryBtn} 
                                    onPress={handleRequestHours}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Request</Text>}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {/* Requests List */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                        Member Requests ({(booking.timingRequests || []).reduce((s, r) => s + r.requestedHours, 0)}/{booking.totalDuration}h)
                    </Text>
                    {(booking.timingRequests || []).map((req, idx) => (
                        <View key={idx} style={styles.requestRow}>
                            <Text style={styles.memberId}>
                                {req.farmerId === user.uid ? '👤 You' : `👤 ${req.farmerId.substring(0, 6)}...`}
                            </Text>
                            <Text style={styles.reqHours}>{req.requestedHours}h</Text>
                            <Text style={styles.reqCost}>₹{req.requestedHours * booking.baseHourlyRate}</Text>
                            <Text style={styles.reqStatus}>{req.status}</Text>
                        </View>
                    ))}
                    {(!booking.timingRequests || booking.timingRequests.length === 0) && (
                        <Text style={styles.emptyText}>No requests yet. Members can submit timing requests above.</Text>
                    )}
                </View>

                {/* Leader: Move to scheduling */}
                {isLeader && booking.status === 'gathering_requests' && (booking.timingRequests || []).length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Leader: Review Requests</Text>
                        <Text style={styles.helpText}>
                            Once enough members have submitted their hours, move to Scheduling to auto-generate time slots.
                        </Text>
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: Colors.gold }]}
                            disabled={actionLoading}
                            onPress={handleMoveToScheduling}
                        >
                            {actionLoading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={[styles.btnText, { color: Colors.navy }]}>Move to Scheduling →</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Leader: Finalize slots */}
                {isLeader && booking.status === 'scheduling' && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Leader: Finalize Schedule</Text>
                        <Text style={styles.helpText}>This will assign slots based on member requests and calculate costs.</Text>
                        <TouchableOpacity 
                            style={[styles.primaryBtn, { backgroundColor: Colors.success }]}
                            onPress={handleFinalizeSchedule}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Auto-Generate & Finalize</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Finalized Slots */}
                {(booking.timeSlots || []).length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Finalized Schedule</Text>
                        {booking.timeSlots.map((slot, idx) => (
                            <View key={idx} style={[
                                styles.slotRow,
                                slot.farmerId === user.uid && styles.slotRowHighlight
                            ]}>
                                <Text style={styles.slotTime}>{slot.startTime} - {slot.endTime}</Text>
                                <Text style={styles.slotMember}>
                                    {slot.farmerId === user.uid ? '👤 You' : slot.farmerId.substring(0, 6) + '...'}
                                </Text>
                                <Text style={styles.slotHours}>{slot.hours}h</Text>
                                <Text style={styles.slotCost}>₹{slot.cost || slot.hours * booking.baseHourlyRate}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Payment & Confirmation */}
                {booking.status === 'waiting_payment' && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Payment Sharing</Text>
                        <Text style={styles.paymentSummary}>
                            {allPaid ? '✅ All members have paid!' : `💳 ${paidCount}/${totalCount} members paid`}
                        </Text>

                        {(booking.payments || []).map((p, i) => (
                            <View key={i} style={styles.paymentRow}>
                                <Text style={styles.paymentUser}>
                                    {p.farmerId === user.uid ? '👤 YOU' : p.farmerId.substring(0, 6) + '...'}
                                </Text>
                                <Text style={styles.paymentHours}>{p.hours}h</Text>
                                <Text style={styles.paymentAmount}>₹{p.amount}</Text>
                                <Text style={[styles.paymentStatus, { color: p.paid ? Colors.success : Colors.error }]}>
                                    {p.paid ? '✓ PAID' : 'UNPAID'}
                                </Text>
                            </View>
                        ))}

                        {/* Pay button for current user if unpaid */}
                        {myPayment && !myPayment.paid && (
                            <TouchableOpacity style={styles.payBtn} onPress={handlePayShare} disabled={actionLoading}>
                                {actionLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.btnText}>💳 Pay My Share (₹{myPayment.amount})</Text>
                                )}
                            </TouchableOpacity>
                        )}

                        {/* Leader confirm button */}
                        {isLeader && (
                            <TouchableOpacity 
                                style={[styles.primaryBtn, { 
                                    backgroundColor: allPaid ? Colors.navy : '#ccc', 
                                    marginTop: 16 
                                }]}
                                onPress={handleConfirmBooking}
                                disabled={actionLoading || !allPaid || booking.status !== 'waiting_payment'}
                            >
                                <Text style={styles.btnText}>
                                    {allPaid ? '🔒 Confirm & Lock Machine' : '⏳ All members must pay before confirming'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Confirmed/Delivered/Active status with lifecycle buttons */}
                {['confirmed', 'delivered', 'active'].includes(booking.status) && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                            {booking.status === 'active' ? '🚜 Booking Active' : booking.status === 'delivered' ? '📦 Machine Delivered' : '✅ Booking Confirmed'}
                        </Text>
                        <Text style={styles.helpText}>
                            {booking.status === 'active' 
                                ? 'Machine is currently in use. Track your time slot below.'
                                : booking.status === 'delivered'
                                ? 'Machine has been delivered. Ready to start work.'
                                : 'Machine is locked for your group. Driver has been notified.'}
                        </Text>
                        {myPayment && (
                            <View style={styles.mySlotCard}>
                                <Text style={styles.mySlotTitle}>Your Slot</Text>
                                {booking.timeSlots?.filter(s => s.farmerId === user.uid).map((slot, i) => (
                                    <Text key={i} style={styles.mySlotTime}>
                                        {slot.startTime} - {slot.endTime} ({slot.hours}h) · ₹{slot.cost || slot.hours * booking.baseHourlyRate}
                                    </Text>
                                ))}
                                <Text style={styles.mySlotPaid}>Payment: Paid (₹{myPayment.amount})</Text>
                            </View>
                        )}

                        {/* GPS Tracking Badge */}
                        {['delivered', 'active'].includes(booking.status) && (
                            <View style={[styles.gpsBadge, { backgroundColor: (GPS_STATUS_COLORS[booking.gpsStatus || 'NO_SIGNAL'] || '#6B7280') + '20' }]}>
                                <Ionicons name="location" size={16} color={GPS_STATUS_COLORS[booking.gpsStatus || 'NO_SIGNAL'] || '#6B7280'} />
                                <Text style={[styles.gpsText, { color: GPS_STATUS_COLORS[booking.gpsStatus || 'NO_SIGNAL'] || '#6B7280' }]}>
                                    GPS: {(booking.gpsStatus || 'NO_SIGNAL').replace(/_/g, ' ')}
                                </Text>
                            </View>
                        )}

                        {/* GP Lifecycle Buttons */}
                        {booking.status === 'confirmed' && (!booking.driverStatus || booking.driverStatus === 'accepted') && (
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: '#3B82F6', marginTop: 12 }]}
                                onPress={handleReceiveGP}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Receive Machine</Text>}
                            </TouchableOpacity>
                        )}

                        {/* Driver Blockade — show when driver required but not accepted */}
                        {booking.status === 'confirmed' && booking.driverStatus && booking.driverStatus !== 'accepted' && (
                            <View style={[styles.primaryBtn, { backgroundColor: '#F59E0B', marginTop: 12 }]}>
                                <Text style={styles.btnText}>⏳ Waiting for Driver to Accept</Text>
                            </View>
                        )}

                        {booking.status === 'delivered' && (
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: '#8B5CF6', marginTop: 12 }]}
                                onPress={handleStartGP}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Start Work</Text>}
                            </TouchableOpacity>
                        )}

                        {booking.status === 'active' && (
                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: '#10B981', marginTop: 12 }]}
                                onPress={handleReturnGP}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Return Machine</Text>}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Completed status */}
                {booking.status === 'completed' && (
                    <View style={[styles.card, { backgroundColor: '#F0FDF4' }]}>
                        <Text style={styles.sectionTitle}>🏁 Booking Completed</Text>
                        <Text style={styles.helpText}>This group booking has been completed successfully.</Text>
                    </View>
                )}

                {/* Cancelled status */}
                {booking.status === 'cancelled' && (
                    <View style={[styles.card, { backgroundColor: '#FEF2F2' }]}>
                        <Text style={styles.sectionTitle}>❌ Booking Cancelled</Text>
                        <Text style={styles.helpText}>
                            This booking was cancelled. 
                            {booking.totalRefunded > 0 ? ` ₹${booking.totalRefunded} refunded.` : ''}
                        </Text>
                        {booking.payments?.filter(p => p.refunded).map((p, i) => (
                            <Text key={i} style={styles.refundText}>
                                💸 {p.farmerId === user.uid ? 'You' : p.farmerId.substring(0, 6)} → ₹{p.amount} refunded
                            </Text>
                        ))}
                    </View>
                )}

                {/* Leader: Cancel button (pre-confirm stages) */}
                {isLeader && !['confirmed', 'active', 'completed', 'cancelled'].includes(booking.status) && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelBooking} disabled={actionLoading}>
                        <Text style={styles.cancelBtnText}>❌ Cancel Group Booking</Text>
                    </TouchableOpacity>
                )}

                {/* Leader: Cancel confirmed booking */}
                {isLeader && booking.status === 'confirmed' && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelBooking} disabled={actionLoading}>
                        <Text style={styles.cancelBtnText}>❌ Cancel Confirmed Booking (Refunds will be issued)</Text>
                    </TouchableOpacity>
                )}

                {/* Back to group */}
                <TouchableOpacity 
                    style={styles.backLink} 
                    onPress={() => navigation.navigate('GroupDetails', { groupId: booking.groupId })}
                >
                    <Text style={styles.backLinkText}>← Back to Group</Text>
                </TouchableOpacity>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { padding: Spacing.m, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: Spacing.l },
    groupName: { fontSize: 24, fontWeight: '900', color: Colors.navy },
    machineName: { fontSize: 18, color: Colors.gold, fontWeight: '700', marginVertical: 4 },
    statusLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
    card: {
        backgroundColor: '#fff', borderRadius: BorderRadius.m,
        padding: Spacing.m, marginBottom: Spacing.m, ...Shadows.soft
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.navy, marginBottom: Spacing.s },
    detail: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
        padding: 10, marginBottom: 12, fontSize: 16
    },
    primaryBtn: {
        backgroundColor: Colors.navy, paddingVertical: 12,
        borderRadius: 8, alignItems: 'center'
    },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    requestRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee'
    },
    memberId: { flex: 2, fontSize: 13 },
    reqHours: { flex: 1, fontWeight: '700', textAlign: 'center' },
    reqCost: { flex: 1, fontWeight: '600', color: Colors.success, textAlign: 'center' },
    reqStatus: { flex: 1, fontSize: 12, color: Colors.gold, textAlign: 'right', fontWeight: '600' },
    helpText: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, fontStyle: 'italic', lineHeight: 18 },
    emptyText: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
    slotRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, marginBottom: 6
    },
    slotRowHighlight: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
    slotTime: { fontWeight: '700', color: Colors.navy, flex: 2 },
    slotMember: { fontSize: 12, flex: 2 },
    slotHours: { fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'center' },
    slotCost: { fontWeight: '700', color: Colors.success, flex: 1, textAlign: 'right' },
    paymentSummary: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginBottom: 12 },
    paymentRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
    },
    paymentUser: { flex: 2, fontSize: 13, fontWeight: '600' },
    paymentHours: { flex: 1, fontSize: 12, textAlign: 'center' },
    paymentAmount: { flex: 1, textAlign: 'center', fontWeight: '800' },
    paymentStatus: { flex: 1, textAlign: 'right', fontSize: 11, fontWeight: '900' },
    payBtn: { backgroundColor: Colors.gold, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
    cancelBtn: { 
        padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', 
        alignItems: 'center', marginBottom: 12, backgroundColor: '#FEF2F2' 
    },
    cancelBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
    mySlotCard: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, marginTop: 8 },
    mySlotTitle: { fontWeight: '800', color: Colors.navy, marginBottom: 4 },
    mySlotTime: { fontSize: 14, color: Colors.navy, marginBottom: 2 },
    mySlotPaid: { fontSize: 12, color: Colors.success, fontWeight: '600', marginTop: 4 },
    refundText: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
    backLink: { padding: 12, alignItems: 'center', marginTop: 8 },
    backLinkText: { color: Colors.navy, fontWeight: '700', fontSize: 14 },
    gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.m, alignSelf: 'center' },
    gpsText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
});
