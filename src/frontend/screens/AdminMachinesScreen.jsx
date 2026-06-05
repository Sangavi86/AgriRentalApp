import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Shadows, Glass } from '../theme/Theme';
import { RealFirestore, db } from '../../backend/services/RealFirebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { bookingService } from '../../backend/services/bookingService';

export default function AdminMachinesScreen({ navigation }) {
    const [machines, setMachines] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [actionLoading, setActionLoading] = React.useState(null);
    const [filterStatus, setFilterStatus] = React.useState('all');

    React.useEffect(() => {
        const machinesRef = collection(db, 'machines');
        const unsub = onSnapshot(machinesRef, (snapshot) => {
            setMachines(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Machines subscription error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const updateStatus = async (id, status) => {
        setActionLoading(id);
        try {
            await RealFirestore.updateMachineStatus(id, status);
            Alert.alert('Success', 'Machine status updated');
        } catch (e) {
            Alert.alert('Error', 'Error updating machine: ' + e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const deleteMachine = async (id) => {
        setActionLoading(id);
        try {
            const hasActive = await bookingService.hasActiveBookings(id);
            if (hasActive) {
                Alert.alert("Cannot Delete", "This machine has active bookings and cannot be removed.");
                setActionLoading(null);
                return;
            }

            Alert.alert('Delete Machine', 'Are you sure?', [
                { text: 'Cancel', onPress: () => setActionLoading(null) },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                    try {
                        await RealFirestore.deleteMachine(id);
                        Alert.alert('Success', 'Machine deleted');
                    } catch (e) {
                        Alert.alert('Error', 'Error deleting machine: ' + e.message);
                    } finally {
                            setActionLoading(null);
                        }
                    }
                }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Error checking bookings: ' + e.message);
            setActionLoading(null);
        }
    };

    const filteredMachines = filterStatus === 'all' 
        ? machines 
        : machines.filter(m => m.status === filterStatus);

    const renderItem = ({ item }) => {
        const statusColors = {
            approved: Colors.success,
            pending: Colors.gold,
            rejected: Colors.error
        };
        const statusColor = statusColors[item.status?.toLowerCase()] || Colors.gold;

        return (
            <View style={styles.machineCard}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.machineName}>{item.name}</Text>
                        <Text style={styles.machineType}>{item.type}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status?.toUpperCase() || 'PENDING'}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="card-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>₹{item.rate}/hr</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{item.ownerName || 'Owner'}</Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#F0F9FF' }]}
                        onPress={() => navigation.navigate('AddMachine', { machineId: item.id })}
                    >
                        <Ionicons name="create-outline" size={18} color="#0369A1" />
                    </TouchableOpacity>
                    
                    {item.status !== 'approved' && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#F0FDF4' }]} 
                            onPress={() => updateStatus(item.id, 'approved')}
                            disabled={actionLoading === item.id}
                        >
                            {actionLoading === item.id ? <ActivityIndicator size="small" color={Colors.success} /> : <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />}
                        </TouchableOpacity>
                    )}
                    
                    {item.status !== 'rejected' && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]} 
                            onPress={() => updateStatus(item.id, 'rejected')}
                            disabled={actionLoading === item.id}
                        >
                            {actionLoading === item.id ? <ActivityIndicator size="small" color={Colors.error} /> : <Ionicons name="close-circle-outline" size={18} color={Colors.error} />}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#F8FAFC' }]} 
                        onPress={() => deleteMachine(item.id)}
                        disabled={actionLoading === item.id}
                    >
                        <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ScreenWrapper noBackground>
            <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
                <Text style={styles.title}>Machine Review</Text>
                
                {/* Filter Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingRight: 20 }}>
                    {['all', 'pending', 'approved', 'rejected'].map(status => (
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
                ) : filteredMachines.length === 0 ? (
                    <Text style={styles.emptyText}>No machines found</Text>
                ) : (
                    <FlatList
                        data={filteredMachines}
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
    machineCard: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: BorderRadius.m,
        marginBottom: 16,
        ...Shadows.soft,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    machineName: { fontSize: 17, fontWeight: '800', color: Colors.navy },
    machineType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 9, fontWeight: '900' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },
    detailRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 12 },
    actionBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 15, fontWeight: '600' }
});

