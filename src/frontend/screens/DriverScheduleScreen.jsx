import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../../backend/services/AuthContext';
import { driverService } from '../../backend/services/driverService';
import StatusBadge from '../components/StatusBadge';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';

const STATUS_ICONS = {
  pending: { name: 'time', color: '#EAB308' },
  confirmed: { name: 'checkmark-circle', color: '#10B981' },
  driver_assigned: { name: 'person-circle', color: '#3B82F6' },
  in_use: { name: 'play-circle', color: '#8B5CF6' },
  completed: { name: 'checkmark-done-circle', color: '#10B981' },
  cancelled: { name: 'ban', color: '#EF4444' },
};

export default function DriverScheduleScreen() {
    const { user } = useAuth();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        const unsub = driverService.subscribeDriverJobs(user.uid, list => {
            setJobs(list);
            setLoading(false);
        });
        return () => unsub && unsub();
    }, [user]);

    if (loading) return (
        <ScreenWrapper><ActivityIndicator color={Colors.navy} size="large" style={{ marginTop: 60 }} /></ScreenWrapper>
    );

    return (
        <ScreenWrapper noPadding>
            {jobs.length === 0 ? (
                <View style={{ padding: Spacing.m }}>
                    <Text style={styles.title}>My Schedule</Text>
                    <View style={{ alignItems: 'center', padding: 40 }}>
                        <Ionicons name="calendar-outline" size={48} color={Colors.textSecondary} />
                        <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>No jobs yet. Accept a job from the portal.</Text>
                    </View>
                </View>
            ) : (
                <FlatList
                    data={jobs}
                    keyExtractor={i => i.id}
                    contentContainerStyle={{ padding: Spacing.m, paddingBottom: 100 }}
                    ListHeaderComponent={() => <Text style={styles.title}>My Schedule</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.topRow}>
                                <Text style={styles.machineName}>{item.machineName}</Text>
                                {STATUS_ICONS[item.bookingStatus] ? (
                                    <Ionicons name={STATUS_ICONS[item.bookingStatus].name} size={18} color={STATUS_ICONS[item.bookingStatus].color} />
                                ) : (
                                    <Ionicons name="information-circle" size={18} color="#aaa" />
                                )}
                            </View>
                            <Text style={styles.detail}>
                                <Ionicons name="calendar-outline" size={12} /> {item.rentalStartDate} → {item.rentalEndDate}
                            </Text>
                            {item.timeSlot && <Text style={styles.detail}><Ionicons name="time-outline" size={12} /> {item.timeSlot}</Text>}
                            <Text style={styles.detail}><Ionicons name="person-outline" size={12} /> Farmer: {item.borrowerName}</Text>
                            <Text style={styles.amount}>₹{item.totalAmount}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                                <StatusBadge type="booking" status={item.bookingStatus} />
                            </View>
                        </View>
                    )}
                />
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    title: { fontSize: 20, fontWeight: '800', color: Colors.navy, marginBottom: Spacing.m },
    card: {
        backgroundColor: '#fff', padding: Spacing.m, borderRadius: BorderRadius.m,
        marginBottom: Spacing.s, ...Shadows.soft,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    machineName: { fontSize: 15, fontWeight: '700', color: Colors.navy },
    icon: { fontSize: 18 },
    detail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    amount: { fontSize: 16, fontWeight: '800', color: Colors.navy, marginTop: 6 },
});

