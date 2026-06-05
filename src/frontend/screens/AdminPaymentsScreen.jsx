import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, Glass, Shadows } from '../theme/Theme';
import { bookingService } from '../../backend/services/bookingService';

export default function AdminPaymentsScreen() {
    const [payments, setPayments] = React.useState([]);
    const [totalRevenue, setTotalRevenue] = React.useState(0);
    const [failedCount, setFailedCount] = React.useState(0);
    const [pendingCount, setPendingCount] = React.useState(0);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        setLoading(true);
        const unsub = bookingService.subscribeAll(list => {
            const paid = list.filter(b => b.paymentStatus === 'paid');
            setPayments(paid);
            const total = paid.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
            setTotalRevenue(total);
            setFailedCount(list.filter(b => b.paymentStatus === 'failed').length);
            setPendingCount(list.filter(b => b.paymentStatus === 'pending').length);
            setLoading(false);
        });
        return () => unsub && unsub();
    }, []);

    const renderItem = ({ item }) => (
        <View style={styles.paymentCard}>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.machineName}>{item.machineName || 'Machine'}</Text>
                    <Text style={styles.subText}>Booking ID: {item.id?.substring(0, 8)}...</Text>
                </View>
                <Text style={styles.amount}>₹{item.totalAmount}</Text>
            </View>
            <View style={styles.details}>
                <Text style={styles.detail}>👤 Borrower: {item.borrowerName || item.borrowerId}</Text>
                <Text style={styles.detail}>👤 Owner: {item.ownerName || item.ownerId}</Text>
                {item.transactionId && <Text style={styles.detail}>💳 Transaction: {item.transactionId}</Text>}
                <Text style={styles.date}>📅 {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
        </View>
    );

    return (
        <ScreenWrapper style={{ backgroundColor: '#F8FAFB' }}>
            <View style={styles.container}>
                <View style={styles.revenueHeader}>
                    <Text style={styles.revenueLabel}>Total Revenue</Text>
                    <Text style={styles.revenueValue}>₹{totalRevenue.toFixed(2)}</Text>
                    <Text style={styles.transactionCount}>{payments.length} Transactions</Text>
                    <View style={styles.subStatsRow}>
                        <Text style={styles.subStat}>Failed: {failedCount}</Text>
                        <Text style={styles.subStat}>Pending: {pendingCount}</Text>
                    </View>
                </View>

                <Text style={styles.listTitle}>Payment History</Text>
                {loading ? (
                    <ActivityIndicator color={Colors.navy} />
                ) : payments.length === 0 ? (
                    <Text style={styles.emptyText}>No payments yet</Text>
                ) : (
                    <FlatList
                        data={payments}
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
    revenueHeader: {
        ...Glass.container,
        backgroundColor: Colors.navy,
        padding: Spacing.xl,
        alignItems: 'center',
        marginBottom: Spacing.xl,
        borderRadius: 12,
        ...Shadows.strong,
    },
    revenueLabel: { color: Colors.gold, fontSize: FontSize.small, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 1 },
    revenueValue: { color: Colors.white, fontSize: 40, fontWeight: 'bold', marginVertical: Spacing.s },
    transactionCount: { color: Colors.gold, fontSize: 12 },
    listTitle: { fontSize: FontSize.title, fontWeight: 'bold', color: Colors.navy, marginBottom: Spacing.m },
    subStatsRow: { flexDirection: 'row', marginTop: Spacing.s, gap: Spacing.m },
    subStat: { color: Colors.white, fontSize: 12 },
    paymentCard: {
        backgroundColor: '#fff',
        padding: Spacing.m,
        marginBottom: Spacing.m,
        borderRadius: 16,
        ...Shadows.soft,
        borderLeftWidth: 4,
        borderLeftColor: Colors.success
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.s },
    machineName: { fontSize: 16, fontWeight: 'bold', color: Colors.navy },
    subText: { fontSize: 10, color: Colors.textSecondary },
    details: { gap: Spacing.xs },
    detail: { fontSize: 12, color: Colors.navy },
    amount: { fontSize: 18, fontWeight: 'bold', color: Colors.success },
    date: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
    emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }
});

