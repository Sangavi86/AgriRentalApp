import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Shadows, Glass } from '../theme/Theme';
import { RealFirestore } from '../../backend/services/RealFirebase';
import { useAuth } from '../../backend/services/AuthContext';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../../backend/firebase/config';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen({ navigation }) {
    const { logout } = useAuth();
    const [stats, setStats] = React.useState({ users: 0, machines: 0, pendingMachines: 0, bookings: 0, gpBookings: 0, revenue: 0 });
    const [loading, setLoading] = React.useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [users, machines, bookings, gpSnap] = await Promise.all([
                RealFirestore.getAllUsers(),
                RealFirestore.getAllMachinesAdmin(),
                RealFirestore.getBookings(),
                getDocs(collection(db, 'groupBookings'))
            ]);

            const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
            const pendingMachines = machines.filter(m => m.status === 'pending').length;
            const revenue = paidBookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

            const activeGpCount = gpSnap.docs.filter(d => {
                const s = d.data().status;
                return ['gathering_requests', 'scheduling', 'waiting_payment', 'confirmed', 'active'].includes(s);
            }).length;

            setStats({
                users: users.length,
                machines: machines.filter(m => m.status === 'approved').length,
                pendingMachines,
                bookings: bookings.filter(b => b.bookingStatus === 'confirmed').length,
                gpBookings: activeGpCount,
                revenue
            });
        } catch (e) {
            console.error('Error fetching stats:', e);
        }
        setLoading(false);
    };

    React.useEffect(() => {
        fetchStats();
    }, []);

    return (
        <ScreenWrapper noBackground>
            <ScrollView 
                refreshControl={<RefreshControl onRefresh={fetchStats} refreshing={loading} />}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.adminTag}>System Administrator</Text>
                            <Text style={styles.title}>Dashboard</Text>
                        </View>
                        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                        </TouchableOpacity>
                    </View>

                    {/* Stats Overview */}
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <View style={styles.grid}>
                        <StatCard 
                            label="Users" 
                            value={stats.users} 
                            color={Colors.agriGreen} 
                            onPress={() => navigation.navigate('AdminUsers')}
                            icon="people"
                        />
                        <StatCard 
                            label="Machines" 
                            value={stats.machines} 
                            color={Colors.agriGreenLight} 
                            onPress={() => navigation.navigate('AdminMachines')}
                            icon="tractor"
                        />
                        <StatCard 
                            label="Bookings" 
                            value={stats.bookings} 
                            color={Colors.agriSage} 
                            onPress={() => navigation.navigate('AdminBookings')}
                            icon="calendar"
                        />
                        <StatCard 
                            label="Revenue" 
                            value={`₹${stats.revenue.toFixed(0)}`} 
                            color={Colors.agriEarth} 
                            onPress={() => navigation.navigate('AdminPayments')}
                            icon="wallet"
                        />
                         <StatCard 
                            label="GP Active" 
                            value={stats.gpBookings} 
                            color={Colors.olive} 
                            onPress={() => navigation.navigate('AdminBookings')}
                            icon="people-circle"
                        />
                    </View>

                    {/* Alerts Section */}
                    {stats.pendingMachines > 0 && (
                        <TouchableOpacity 
                            style={styles.alertCard}
                            onPress={() => navigation.navigate('AdminMachines')}
                        >
                            <View style={styles.alertIconContainer}>
                                <Ionicons name="alert-circle" size={24} color={Colors.gold} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.alertTitle}>Pending Reviews</Text>
                                <Text style={styles.alertDesc}>{stats.pendingMachines} machines need approval</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.gold} />
                        </TouchableOpacity>
                    )}

                    {/* Management Sections */}
                    <Text style={styles.sectionTitle}>Management</Text>
                    <View style={styles.managementGrid}>
                        <ManagementCard 
                            title="Users" 
                            desc="Manage farmers, owners & drivers" 
                            icon="people-outline" 
                            color={Colors.agriGreen}
                            onPress={() => navigation.navigate('AdminUsers')}
                        />
                        <ManagementCard 
                            title="Machinery" 
                            desc="Approve & manage inventory" 
                            icon="construct-outline" 
                            color={Colors.agriGreenLight}
                            onPress={() => navigation.navigate('AdminMachines')}
                        />
                        <ManagementCard 
                            title="Bookings" 
                            desc="Monitor all rental activity" 
                            icon="calendar-outline" 
                            color={Colors.agriSage}
                            onPress={() => navigation.navigate('AdminBookings')}
                        />
                        <ManagementCard 
                            title="Payments" 
                            desc="Track revenue & payouts" 
                            icon="card-outline" 
                            color={Colors.agriEarth}
                            onPress={() => navigation.navigate('AdminPayments')}
                        />
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const StatCard = ({ label, value, color, onPress, icon }) => (
    <TouchableOpacity style={[styles.card, { borderTopColor: color }]} onPress={onPress}>
        <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
        <Text style={styles.statValue}>{value}</Text>
    </TouchableOpacity>
);

const ManagementCard = ({ title, desc, icon, color, onPress }) => (
    <TouchableOpacity style={styles.mgmtCard} onPress={onPress}>
        <View style={[styles.mgmtIconBox, { backgroundColor: color }]}>
            <Ionicons name={icon} size={24} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.mgmtTitle}>{title}</Text>
            <Text style={styles.mgmtDesc}>{desc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { padding: Spacing.m },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.s },
    adminTag: { fontSize: 10, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 24, fontWeight: '900', color: Colors.agriGreen, marginTop: -4 },
    logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...Shadows.soft },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.xl },
    card: {
        backgroundColor: '#FFF',
        width: '47%', 
        padding: Spacing.m,
        borderTopWidth: 3,
        borderRadius: BorderRadius.m,
        ...Shadows.soft,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.m },
    iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '700', flex: 1 },
    statValue: { fontSize: 24, fontWeight: '900', color: Colors.navy },
    
    alertCard: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FEF3C7',
        padding: Spacing.m,
        marginBottom: Spacing.xl,
        borderRadius: BorderRadius.m,
        flexDirection: 'row',
        alignItems: 'center',
    },
    alertIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.m },
    alertTitle: { fontSize: 14, fontWeight: '800', color: Colors.navy },
    alertDesc: { fontSize: 12, color: '#D97706', marginTop: 2 },
    
    sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    managementGrid: { gap: 12 },
    mgmtCard: {
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: BorderRadius.m,
        flexDirection: 'row',
        alignItems: 'center',
        ...Shadows.soft,
    },
    mgmtIconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    mgmtTitle: { fontSize: 15, fontWeight: '700', color: Colors.navy },
    mgmtDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});

