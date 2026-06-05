import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, TextInput, Platform, Dimensions
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';
import { useAuth } from '../../backend/services/AuthContext';
import { groupService } from '../../backend/services/groupService';
import { groupBookingService } from '../../backend/services/groupBookingService';
import { machineService } from '../../backend/services/machineService';
import StatusBadge from '../components/StatusBadge';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function GroupDetailsScreen({ route, navigation }) {
    const { groupId } = route.params;
    const { user } = useAuth();
    
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [machines, setMachines] = useState([]);
    const [showMachinePicker, setShowMachinePicker] = useState(false);
    const [creatingBooking, setCreatingBooking] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [activeBookings, setActiveBookings] = useState([]);

    const getMinDate = () => { return new Date().toISOString().split('T')[0]; };
    const [bookingDate, setBookingDate] = useState(getMinDate());
    const [totalDuration, setTotalDuration] = useState('4');

    useEffect(() => {
        loadData();
    }, [groupId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const g = await groupService.getGroup(groupId);
            setGroup(g);
            const m = await machineService.getAllApproved();
            setMachines(m);
            const gpBookings = await groupBookingService.getGPBookingsByGroup(groupId);
            setActiveBookings(gpBookings.filter(b => b.status !== 'cancelled'));
        } catch (e) {
            Alert.alert('Error', 'Could not load group details.');
        } finally {
            setLoading(false);
        }
    };

    const isLeader = group?.leaderId === user?.uid;
    const isMember = group?.members?.includes(user?.uid);

    const handleCreateBooking = async (machine) => {
        if (creatingBooking) return;
        setCreatingBooking(true);
        try {
            const duration = Number(totalDuration);
            const bookingId = await groupBookingService.createGPBooking(
                groupId, machine, bookingDate, duration, user.uid
            );
            Alert.alert('✅ Success', 'Group Booking Session created!');
            setShowMachinePicker(false);
            navigation.navigate('GroupBooking', { bookingId });
        } catch (e) {
            Alert.alert('❌ Error', e.message);
        } finally {
            setCreatingBooking(false);
        }
    };

    const handleLeaveGroup = async () => {
        Alert.alert('Leave Group', 'Are you sure?', [
            { text: 'Cancel' },
            { text: 'Leave', style: 'destructive', onPress: async () => {
                try {
                    await groupService.leaveGroup(groupId, user.uid);
                    navigation.goBack();
                } catch (e) {
                    Alert.alert('Error', e.message);
                }
            }}
        ]);
    };

    if (loading) return <ScreenWrapper><ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} /></ScreenWrapper>;
    if (!group) return <ScreenWrapper><Text style={{ padding: 20 }}>Group not found.</Text></ScreenWrapper>;

    const memberCount = group.members?.length || 0;
    const maxMembers = group.maxMembers || 20;
    const progress = Math.min(memberCount / maxMembers, 1);

    return (
        <ScreenWrapper noPadding>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
                    <Text style={styles.headerSub}>{group.location?.village}, {group.location?.district}</Text>
                </View>
                {isLeader && (
                   <View style={styles.leaderBadge}>
                       <Text style={styles.leaderBadgeText}>LEADER</Text>
                   </View>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.centeredContent}>
                    {/* Capacity Progress Bar */}
                    <View style={styles.card}>
                        <View style={styles.capacityHeader}>
                            <Text style={styles.sectionTitle}>Group Membership</Text>
                            <Text style={styles.capacityText}>{memberCount} / {maxMembers} Members</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <Text style={styles.radiusLimit}>📡 Required Radius: {group.radiusLimit || 10}km</Text>
                        
                        <View style={styles.membersList}>
                            {group.members?.map((m, i) => (
                                <View key={i} style={styles.memberItem}>
                                   <View style={styles.memberAvatar}>
                                      <Ionicons name="person" size={14} color={Colors.primary} />
                                   </View>
                                   <Text style={styles.memberText} numberOfLines={1}>{m === user?.uid ? 'You (Member)' : `Farmer ${m.substring(0, 4)}`}</Text>
                                   {m === group.leaderId && <Ionicons name="star" size={14} color={Colors.agriGreen} />}
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Active Sessions */}
                    {activeBookings.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Active Booking Sessions</Text>
                            <Text style={styles.subInfo}>Members can request time during these sessions</Text>
                            {activeBookings.map(b => (
                                <TouchableOpacity 
                                    key={b.id} 
                                    style={styles.sessionCard}
                                    onPress={() => navigation.navigate('GroupBooking', { bookingId: b.id })}
                                >
                                    <View style={styles.sessionIcon}>
                                        <Ionicons name="hardware-chip-outline" size={20} color={Colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sessionMachine}>{b.machineName}</Text>
                                        <Text style={styles.sessionDate}>{b.bookingDate} • {b.totalDuration}h Total</Text>
                                    </View>
                                    <StatusBadge status={b.status} />
                                    <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} style={{ marginLeft: 8 }} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Leader: Tools */}
                    {isLeader && (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Leader Operations</Text>
                            <Text style={styles.subInfo}>Initiate a collective rental session for the group</Text>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Target Booking Date</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="YYYY-MM-DD"
                                        value={bookingDate}
                                        onChangeText={setBookingDate}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Total Usage Duration (Max 12h)</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="time-outline" size={18} color={Colors.textSecondary} style={{ marginRight: 10 }} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Duration in hours"
                                        value={totalDuration}
                                        onChangeText={setTotalDuration}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.primaryBtn, showMachinePicker && styles.activeBtn]}
                                onPress={() => setShowMachinePicker(!showMachinePicker)}
                            >
                                <Text style={styles.primaryBtnText}>
                                    {showMachinePicker ? 'Close Machine Selection' : 'Select Machine & Create'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Machine Picker */}
                    {showMachinePicker && (
                        <View style={styles.pickerContainer}>
                            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Choose Equipment</Text>
                            {machines.length === 0 ? (
                                <Text style={styles.emptyText}>No verified machines nearby</Text>
                            ) : (
                                machines.map(m => (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={styles.machineCard}
                                        onPress={() => handleCreateBooking(m)}
                                        disabled={creatingBooking}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.machineNameText}>{m.name}</Text>
                                            <Text style={styles.machineInfoText}>{m.type} • {m.location?.village}</Text>
                                        </View>
                                        <View style={styles.priceBadge}>
                                            <Text style={styles.priceText}>₹{m.basePay}/hr</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}

                    {/* Danger Zone */}
                    <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
                        <Ionicons name="exit-outline" size={16} color={Colors.error} style={{ marginRight: 8 }} />
                        <Text style={styles.leaveBtnText}>Withdraw from Group</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: Spacing.m,
        paddingTop: Platform.OS === 'ios' ? 48 : 20,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        ...Shadows.soft,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: Colors.primary },
    headerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    leaderBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.round },
    leaderBadgeText: { fontSize: 9, fontWeight: '900', color: '#1565C0' },

    scrollContent: { paddingVertical: 24, paddingBottom: 60 },
    centeredContent: { alignSelf: 'center', width: '100%', maxWidth: 800, paddingHorizontal: Spacing.m },
    
    card: {
        backgroundColor: Colors.white, borderRadius: BorderRadius.m,
        padding: Spacing.m, marginBottom: 20, ...Shadows.soft,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: Colors.primary },
    subInfo: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 16 },

    capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    capacityText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
    progressBarBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    progressBarFill: { height: '100%', backgroundColor: Colors.agriGreen, borderRadius: 4 },
    radiusLimit: { fontSize: 12, color: '#D32F2F', fontWeight: '700', marginBottom: 16 },

    membersList: { marginTop: 8 },
    memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
    memberAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    memberText: { flex: 1, fontSize: 14, color: Colors.primary, fontWeight: '600' },

    sessionCard: {
        flexDirection: 'row', alignItems: 'center', padding: 12,
        backgroundColor: '#FAFBFC', borderRadius: BorderRadius.s, marginBottom: 10,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    sessionIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12, ...Shadows.soft },
    sessionMachine: { fontSize: 14, fontWeight: '900', color: Colors.primary },
    sessionDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', height: 48,
        backgroundColor: '#F8FAFC', borderRadius: BorderRadius.s,
        paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0'
    },
    input: { flex: 1, fontSize: 14, color: Colors.primary, fontWeight: '600' },

    primaryBtn: {
        backgroundColor: Colors.primary, height: 50,
        borderRadius: BorderRadius.m, alignItems: 'center', justifyContent: 'center',
        marginTop: 8, ...Shadows.soft
    },
    activeBtn: { backgroundColor: Colors.agriGreen },
    primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

    pickerContainer: { marginBottom: 20 },
    machineCard: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        backgroundColor: '#FFF', borderRadius: BorderRadius.m, marginBottom: 12,
        ...Shadows.soft, borderWidth: 1, borderColor: '#F1F5F9'
    },
    machineNameText: { fontSize: 15, fontWeight: '900', color: Colors.primary },
    machineInfoText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    priceBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.round },
    priceText: { fontSize: 13, fontWeight: '900', color: '#166534' },

    leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
    leaveBtnText: { color: Colors.error, fontWeight: '800', fontSize: 14 },
    emptyText: { textAlign: 'center', color: Colors.textSecondary, fontStyle: 'italic', paddingVertical: 20 },
});
