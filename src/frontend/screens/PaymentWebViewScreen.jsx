import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, SafeAreaView, ScrollView, Alert
} from 'react-native';
import { bookingService } from '../../backend/services/bookingService';
import { groupBookingService } from '../../backend/services/groupBookingService';
import { useAuth } from '../../backend/services/AuthContext';
import { Colors, Spacing, FontSize, Shadows, BorderRadius } from '../theme/Theme';

export default function PaymentWebViewScreen({ route, navigation }) {
    const {
        bookingId,
        amount,
        machineName = 'Agricultural Equipment',
        borrowerName = 'Customer',
        needDriver = false,
        isGroupPayment = false,
    } = route.params;

    const { user } = useAuth();
    const [paymentState, setPaymentState] = useState('idle'); // idle, processing, success, error
    // Guard: prevent double-payment if button tapped rapidly or screen revisited
    const isProcessing = useRef(false);

    const handlePayment = async () => {
        if (isProcessing.current) return; // Already processing — bail out
        isProcessing.current = true;
        setPaymentState('processing');

        setTimeout(async () => {
            try {
                if (isGroupPayment) {
                    // ── GROUP PAYMENT: update groupBookings collection ──
                    const farmerId = user?.uid;
                    if (!farmerId) throw new Error('User not authenticated.');
                    await groupBookingService.payGPShare(bookingId, farmerId);
                } else {
                    // ── NORMAL PAYMENT: update bookings collection ──
                    await bookingService.updateBooking(bookingId, {
                        paymentStatus: 'paid',
                        bookingStatus: 'confirmed',
                        transactionId: 'PAY_' + Date.now(),
                        paidAt: new Date().toISOString(),
                    });
                }

                setPaymentState('success');

                setTimeout(() => {
                    if (isGroupPayment) {
                        // Go back to GroupBookingScreen — real-time listener updates UI
                        navigation.goBack();
                    } else {
                        navigation.navigate('MainTabs', { screen: 'Orders' });
                    }
                }, 1500);

            } catch (e) {
                console.error('[PaymentWebView] Payment error:', e);
                isProcessing.current = false; // Allow retry on error
                setPaymentState('error');
                Alert.alert(
                    'Payment Failed',
                    e.message || 'Something went wrong. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        }, 1500);
    };

    if (paymentState === 'success') {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <View style={styles.successCircle}>
                    <Text style={styles.successCheck}>✓</Text>
                </View>
                <Text style={styles.successText}>Payment Successful!</Text>
                <Text style={styles.redirectText}>Redirecting...</Text>
            </SafeAreaView>
        );
    }

    if (paymentState === 'processing') {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Colors.gold} />
                <Text style={styles.processingText}>Processing secure payment...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>✕ Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SECURE CHECKOUT</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardHeader}>Order Summary</Text>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Equipment</Text>
                        <Text style={styles.summaryValue}>{machineName}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Driver Service</Text>
                        <Text style={styles.summaryValue}>{needDriver ? 'Included' : 'Self-drive'}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalAmount}>₹{amount}</Text>
                    </View>
                </View>

                <View style={styles.secureCard}>
                    <Text style={styles.secureIcon}>🔒</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.secureTitle}>Guaranteed Safe Checkout</Text>
                        <Text style={styles.secureDesc}>
                            Your payment is secured with 256-bit encryption. We never store your full payment details locally.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.payBtn} onPress={handlePayment}>
                    <Text style={styles.payBtnText}>Pay ₹{amount}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F8FAFB' },
    centerContainer: {
        flex: 1, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center'
    },
    successCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
        ...Shadows.strong
    },
    successCheck: { color: 'white', fontSize: 40, fontWeight: 'bold' },
    successText: { color: 'white', fontSize: FontSize.title, fontWeight: 'bold' },
    redirectText: { color: 'rgba(255,255,255,0.7)', marginTop: 10 },
    processingText: { color: 'white', fontSize: 16, marginTop: 16, fontWeight: '600' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.navy, paddingHorizontal: Spacing.m, paddingVertical: Spacing.m,
    },
    cancelBtn: { padding: 8, marginLeft: -8 },
    cancelText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
    headerTitle: { color: Colors.white, fontSize: 14, fontWeight: '800', letterSpacing: 1 },

    content: { padding: Spacing.m },
    card: {
        backgroundColor: 'white', borderRadius: BorderRadius.m, padding: Spacing.xl,
        marginBottom: Spacing.m, ...Shadows.soft
    },
    cardHeader: { color: Colors.primary, fontSize: FontSize.title, fontWeight: 'bold', marginBottom: Spacing.l },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.m },
    summaryLabel: { color: Colors.textSecondary, fontSize: 15 },
    summaryValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: Spacing.m },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.s },
    totalLabel: { color: Colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
    totalAmount: { color: Colors.primary, fontSize: 24, fontWeight: '900' },

    secureCard: {
        flexDirection: 'row', backgroundColor: 'rgba(46, 204, 113, 0.1)',
        padding: Spacing.l, borderRadius: BorderRadius.m, alignItems: 'center'
    },
    secureIcon: { fontSize: 24, marginRight: Spacing.m },
    secureTitle: { color: Colors.textPrimary, fontWeight: 'bold', marginBottom: 4 },
    secureDesc: { color: Colors.textSecondary, fontSize: 12, lineHeight: 16 },

    footer: {
        padding: Spacing.m, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee',
        ...Shadows.strong
    },
    payBtn: {
        backgroundColor: Colors.primary, padding: Spacing.m, borderRadius: BorderRadius.round,
        alignItems: 'center'
    },
    payBtnText: { color: Colors.white, fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }
});

