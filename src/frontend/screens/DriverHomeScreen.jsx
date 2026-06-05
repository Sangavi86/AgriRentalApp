import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    TextInput, Alert, Dimensions, ActivityIndicator, RefreshControl, Modal, Platform
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';
import { useAuth } from '../../backend/services/AuthContext';
import { useConfig } from '../../backend/services/ConfigContext';
import { bookingService } from '../../backend/services/bookingService';
import { driverService } from '../../backend/services/driverService';

const STATUS_LABELS = {
    pending: '🟡 Pending',
    confirmed: '🟢 Confirmed',
    driver_assigned: '🔵 Assigned',
    payment_failed: '🔴 Payment Failed',
};

export default function DriverHomeScreen({ navigation }) {
    const { user, logout } = useAuth();
    const { config } = useConfig();
    const [search, setSearch] = useState('');
    const [availableJobs, setAvailableJobs] = useState([]);
    const [myJobs, setMyJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('available'); // 'available' | 'my_jobs'
    const [assigning, setAssigning] = useState(null);
    const [profileModalVisible, setProfileModalVisible] = useState(false);

    useEffect(() => {
        // Subscribe to available jobs (needDriver=true AND no driverId)
        setLoading(true);
        let unsubAvailable = () => { };
        if (user?.uid) {
            unsubAvailable = bookingService.subscribeAvailableJobs(user.uid, list => {
                setAvailableJobs(list);
                setLoading(false);
                setRefreshing(false);
            });
        }

        // Subscribe to this driver's own jobs
        let unsubMine = () => { };
        if (user?.uid) {
            unsubMine = driverService.subscribeDriverJobs(user.uid, list => {
                setMyJobs(list);
            });
        }

        return () => { unsubAvailable && unsubAvailable(); unsubMine && unsubMine(); };
    }, [user]);

    const handleAccept = async (job) => {
        // immediate optimistic change and disable
        if (!job || !user?.uid) return;
        setAssigning(job.id);
        try {
            await driverService.acceptJob(job.id, user.uid);
            Alert.alert('Job Accepted!', 'This job is now assigned to you.');
            setActiveTab('my_jobs');
        } catch (e) {
            Alert.alert('Error', 'Could not accept job: ' + e.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleReject = async (job) => {
        try {
            await driverService.rejectJob(job.id, user.uid);
            Alert.alert('Job Rejected', 'The job has been returned to available pool.');
        } catch (e) {
            Alert.alert('Error', e.message);
        }
    };

    const handleMarkComplete = async (jobId) => {
        try {
            await bookingService.updateBooking(jobId, { bookingStatus: 'completed' });
            if (user?.uid) await driverService.markAvailable(user.uid);
            Alert.alert('✅ Job Completed!', 'You are now available for new jobs.');
        } catch (e) {
            Alert.alert('Error', e.message);
        }
    };

    const jobs = activeTab === 'available' ? availableJobs : myJobs;
    const filtered = jobs.filter(j =>
        (j.machineName || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalIncome = myJobs
        .filter(j => j.bookingStatus === 'completed' || j.paymentStatus === 'paid')
        .reduce((sum, j) => sum + Number(j.totalAmount || 0), 0);

    const { width } = Dimensions.get('window');
    const numColumns = width >= 1400 ? 3 : width >= 768 ? 2 : 1;
    const gap = Spacing.m;

    const renderJobCard = ({ item }) => {
        const isMyJob = activeTab === 'my_jobs';
        return (
            <View style={styles.jobCard}>
                <View style={styles.jobHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.machineName}>{item.machineName}</Text>
                        <Text style={styles.machineType}>{item.machineType || 'Agricultural Machine'}</Text>
                    </View>
                    {isMyJob && (
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{STATUS_LABELS[item.bookingStatus] || item.bookingStatus}</Text>
                        </View>
                    )}
                    {!isMyJob && (
                        <View style={[styles.statusBadge, { backgroundColor: item.bookingType === 'group' ? '#DBEAFE' : '#FEF9C3' }]}>
                            <Text style={[styles.statusText, { color: item.bookingType === 'group' ? Colors.primary : '#854D0E' }]}>
                                {item.bookingType === 'group' ? '👥 Group Rental' : 'New Job'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.jobDetails}>
                    {item.bookingType === 'group' ? (
                        <>
                            <Text style={styles.detailRow}>📍 Central Location: {item.deliveryLocation?.village || 'Village Center'}</Text>
                            <Text style={styles.detailRow}>📅 Date: {item.bookingDate || 'Scheduled'}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.detailRow}>👤 Farmer: {item.borrowerName || item.borrowerId?.substring(0, 8) + '...'}</Text>
                            <Text style={styles.detailRow}>📅 Date: {item.rentalStartDate} → {item.rentalEndDate}</Text>
                        </>
                    )}
                    <Text style={styles.detailRow}>⏰ Time: {item.deliveryTime || item.timeSlot} → {item.pickupTime}</Text>
                    {item.needDriver && <Text style={styles.detailRow}>🚗 Driver requested ✓</Text>}
                </View>

                <View style={styles.priceSection}>
                    <Text style={styles.priceLabel}>AMOUNT</Text>
                    <Text style={styles.price}>₹{item.totalAmount || 0}</Text>
                </View>

                {item.driverStatus === 'pending_driver_accept' || (!isMyJob && (item.bookingStatus === 'pending' || item.bookingStatus === 'confirmed')) ? (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#EF4444', flex: 1, marginRight: 6 }]}
                            onPress={() => handleReject(item)}
                        >
                            <Text style={styles.actionBtnText}>✕ Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: Colors.primary, flex: 2 }, assigning === item.id && { opacity: 0.6 }]}
                            onPress={() => handleAccept(item)}
                            disabled={assigning === item.id}
                        >
                            {assigning === item.id
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.actionBtnText}>✓ Accept Job</Text>
                            }
                        </TouchableOpacity>
                    </View>
                ) : (
                    item.bookingStatus === 'driver_assigned' || item.bookingStatus === 'in_use' ? (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => handleMarkComplete(item.id)}
                        >
                            <Text style={styles.actionBtnText}>✓ Mark as Completed</Text>
                        </TouchableOpacity>
                    ) : null
                )}
            </View>
        );
    };

    return (
        <ScreenWrapper noPadding>
            <View style={{ flex: 1, backgroundColor: Colors.bgLight }}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.brandText}>Driver Portal</Text>
                            <Text style={styles.brandSub}>Welcome, {user?.name || user?.displayName || user?.phoneNumber || 'Driver'}</Text>
                            {Array.isArray(user?.capabilities) && user.capabilities.length > 0 && (
                                <Text style={styles.skillsText}>Skills: {user.capabilities.join(', ')}</Text>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={styles.earningsBadge}>
                                <Text style={styles.earningsLabel}>TOTAL EARNED</Text>
                                <Text style={styles.earningsAmount}>₹{totalIncome}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={styles.avatar}>
                                <Text style={styles.avatarText}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabRow}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'available' && styles.tabActive]}
                            onPress={() => setActiveTab('available')}
                        >
                            <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
                                Available Jobs ({availableJobs.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'my_jobs' && styles.tabActive]}
                            onPress={() => setActiveTab('my_jobs')}
                        >
                            <Text style={[styles.tabText, activeTab === 'my_jobs' && styles.tabTextActive]}>
                                My Jobs ({myJobs.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search */}
                    <View style={styles.searchBar}>
                        <Text style={{ marginRight: 8 }}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search jobs..."
                            placeholderTextColor={Colors.greyMedium}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                {/* List */}
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={Colors.gold} />
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
                        <Text style={{ fontSize: 48 }}>🚜</Text>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.primary, marginTop: Spacing.m }}>
                            {activeTab === 'available' ? 'No Available Jobs' : 'No Jobs Yet'}
                        </Text>
                        <Text style={{ color: Colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
                            {activeTab === 'available' ? 'Check back soon for new jobs!' : 'Accept a job from the Available tab.'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        key={`driver-jobs-${numColumns}`}
                        data={filtered}
                        keyExtractor={item => item.id}
                        numColumns={numColumns > 1 ? numColumns : undefined}
                        columnWrapperStyle={numColumns > 1 ? { gap } : undefined}
                        renderItem={renderJobCard}
                        contentContainerStyle={{ padding: gap, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />}
                    />
                )}

                <Modal
                    visible={profileModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setProfileModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Operator Profile</Text>
                            <Text style={styles.modalText}>{user?.name || user?.displayName || 'Operator'}</Text>
                            <Text style={styles.modalText}>{user?.phone || user?.phoneNumber || 'Phone not set'}</Text>
                            
                            <TouchableOpacity style={styles.modalOption} onPress={() => { setProfileModalVisible(false); setActiveTab('my_jobs'); }}>
                                <Text style={styles.modalOptionText}>My Activity</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalOption} onPress={() => { setProfileModalVisible(false); navigation.navigate('Earnings'); }}>
                                <Text style={styles.modalOptionText}>Earnings History</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalOption} onPress={() => { setProfileModalVisible(false); navigation.navigate('Profile'); }}>
                                <Text style={styles.modalOptionText}>View Full Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalOption, { borderBottomWidth: 0 }]} onPress={() => { setProfileModalVisible(false); logout(); }}>
                                <Text style={[styles.modalOptionText, { color: '#DC2626' }]}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: Colors.forestGreen, paddingTop: Platform.OS === 'ios' ? 56 : 32, paddingBottom: Spacing.m,
        paddingHorizontal: Spacing.m, borderBottomLeftRadius: BorderRadius.l,
        borderBottomRightRadius: BorderRadius.l, ...Shadows.strong, zIndex: 10, gap: Spacing.s,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    brandText: { fontSize: 22, fontWeight: '900', color: Colors.cream },
    brandSub: { fontSize: 13, color: 'rgba(253, 251, 246, 0.8)', marginTop: 2 },
    skillsText: { fontSize: 11, color: Colors.gold, marginTop: 4, fontWeight: '600' },
    earningsBadge: { backgroundColor: 'rgba(253, 251, 246, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
    earningsLabel: { fontSize: 9, color: 'rgba(253, 251, 246, 0.7)', fontWeight: '800' },
    earningsAmount: { fontSize: 13, color: Colors.gold, fontWeight: '900' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(253, 251, 246, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(253, 251, 246, 0.3)' },
    avatarText: { fontSize: 16, fontWeight: 'bold', color: Colors.cream },
    tabRow: { flexDirection: 'row', gap: Spacing.s, marginTop: 4 },
    tab: {
        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
        backgroundColor: 'rgba(253, 251, 246, 0.1)',
    },
    tabActive: { backgroundColor: Colors.gold },
    tabText: { color: 'rgba(253, 251, 246, 0.8)', fontWeight: '700', fontSize: 13 },
    tabTextActive: { color: Colors.forestGreen },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cream,
        borderRadius: 14, paddingHorizontal: Spacing.m, height: 44, ...Shadows.soft,
    },
    searchInput: { flex: 1, fontSize: 14, color: Colors.forestGreen },
    jobCard: {
        backgroundColor: Colors.cream, borderRadius: BorderRadius.m,
        padding: Spacing.m, ...Shadows.soft, marginBottom: Spacing.m, flex: 1,
        borderWidth: 1, borderColor: 'rgba(26, 77, 58, 0.05)'
    },
    jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.m },
    machineName: { fontSize: 16, fontWeight: 'bold', color: Colors.forestGreen },
    machineType: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    statusBadge: { backgroundColor: '#E1E9E5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700', color: Colors.forestGreen },
    jobDetails: { gap: 6, marginBottom: Spacing.m, paddingBottom: Spacing.m, borderBottomWidth: 1, borderBottomColor: '#F0EBE0' },
    detailRow: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
    priceSection: { alignItems: 'center', marginBottom: Spacing.m },
    priceLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' },
    price: { fontSize: 24, fontWeight: '900', color: Colors.forestGreen },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { color: Colors.cream, fontWeight: '800', fontSize: 14 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(26, 77, 58, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: Colors.cream,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 24,
        maxHeight: '60%',
        ...Shadows.strong,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.forestGreen,
        marginBottom: 12,
    },
    modalText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 8,
        fontWeight: '600'
    },
    modalOption: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(26, 77, 58, 0.1)',
    },
    modalOptionText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.forestGreen,
    },
});

