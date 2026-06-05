import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, Pressable, Platform, Dimensions
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, Shadows, BorderRadius, FontSize } from '../theme/Theme';
import { useAuth } from '../../backend/services/AuthContext';
import { groupService } from '../../backend/services/groupService';

const { width } = Dimensions.get('window');

export default function GroupsListScreen({ navigation }) {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [discoverableGroups, setDiscoverableGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDiscover, setShowDiscover] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [userLocation, setUserLocation] = useState(null);

    // Create Group State
    const [newGroupName, setNewGroupName] = useState('');
    const [village, setVillage] = useState('');
    const [district, setDistrict] = useState('');
    const [radiusLimit, setRadiusLimit] = useState('10');
    const [detectingLocation, setDetectingLocation] = useState(false);

    useEffect(() => {
        loadData();
        getUserLocation();
    }, [showDiscover]);

    const getUserLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            }
        } catch (e) {
            console.log('Location error:', e);
        }
    };

    const autoDetectLocation = async () => {
        setDetectingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'GPS access is required.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);

            const [address] = await Location.reverseGeocodeAsync(loc);
            if (address) {
                setVillage(address.subregion || address.city || '');
                setDistrict(address.region || address.district || '');
            }
            Alert.alert('✅ Location Detected', 'Village and district auto-filled.');
        } catch (e) {
            Alert.alert('Error', 'Could not detect location.');
        } finally {
            setDetectingLocation(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            if (showDiscover) {
                const data = await groupService.discoverGroups(user.uid, userLocation);
                setDiscoverableGroups(data);
            } else {
                const data = await groupService.getGroupsByUser(user.uid);
                setGroups(data);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !village.trim() || !district.trim()) {
            Alert.alert('Missing Info', 'Please fill all fields.');
            return;
        }
        setActionLoading(true);
        try {
            const location = {
                village: village.trim(),
                district: district.trim(),
                lat: userLocation?.lat || 12.9716,
                lng: userLocation?.lng || 77.5946
            };
            await groupService.createGroup(newGroupName.trim(), user.uid, location, Number(radiusLimit));
            Alert.alert('✅ Success', 'Group created!');
            setShowCreateModal(false);
            setNewGroupName(''); setVillage(''); setDistrict('');
            loadData();
        } catch (e) {
            Alert.alert('❌ Error', e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinGroup = async (groupId) => {
        setActionLoading(true);
        try {
            await groupService.joinGroup(groupId, user.uid, userLocation || { lat: 12.9716, lng: 77.5946 });
            Alert.alert('✅ Success', 'Welcome to the group!');
            setShowDiscover(false);
            loadData();
        } catch (e) {
            Alert.alert('Cannot Join', e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const renderGroupCard = ({ item, index }) => {
        const isFull = item.members?.length >= (item.maxMembers || 20);
        const isLeader = item.leaderId === user?.uid;

        return (
            <Pressable
                style={[
                    styles.groupCard,
                    Platform.OS === 'web' && {
                        animation: `slideUpFade ${300}ms cubic-bezier(0.4, 0, 0.2, 1) ${index * 50}ms both`,
                    },
                    Platform.OS === 'web' && {
                        transition: `all ${200}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                        ':active': {
                            transform: 'scale(0.96)',
                        },
                        ':hover': {
                            transform: 'scale(1.02) translateY(-4px)',
                            boxShadow: '0 20px 40px -5px rgba(26, 77, 58, 0.12)',
                        },
                    }
                ]}
                onPress={() => !showDiscover && navigation.navigate('GroupDetails', { groupId: item.id })}
                disabled={showDiscover}
            >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                     <Ionicons name="people" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                     <Text style={styles.groupName}>{item.name}</Text>
                     <Text style={styles.groupLoc}>📍 {item.location?.village}, {item.location?.district}</Text>
                  </View>
                  {isLeader && !showDiscover && (
                      <View style={styles.leaderBadge}>
                          <Text style={styles.leaderBadgeText}>LEADER</Text>
                      </View>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.statRow}>
                    <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.statText}>{item.members?.length || 0}/{item.maxMembers || 20}</Text>
                    <Ionicons name="radio-outline" size={14} color={Colors.textSecondary} style={{ marginLeft: 12 }} />
                    <Text style={styles.statText}>{item.radiusLimit || 10}km radius</Text>
                  </View>

                  {showDiscover ? (
                    <TouchableOpacity
                        style={[styles.joinBtnSmall, isFull && styles.btnDisabled]}
                        onPress={() => handleJoinGroup(item.id)}
                        disabled={actionLoading || isFull}
                    >
                        <Text style={styles.joinBtnTextSmall}>{isFull ? 'Full' : 'Join Group'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                  )}
                </View>
            </Pressable>
        );
    };

    return (
        <ScreenWrapper noPadding>
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{showDiscover ? 'Find Communities' : 'My Communities'}</Text>
                    <Text style={styles.headerSub}>Collective farming networks</Text>
                </View>
                <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.createBtnText}>Create</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity 
                  style={[styles.tab, !showDiscover && styles.activeTab]} 
                  onPress={() => setShowDiscover(false)}
                >
                    <Text style={[styles.tabText, !showDiscover && styles.activeTabText]}>My Groups</Text>
                    {!showDiscover && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, showDiscover && styles.activeTab]} 
                  onPress={() => setShowDiscover(true)}
                >
                    <Text style={[styles.tabText, showDiscover && styles.activeTabText]}>Discover Nearby</Text>
                    {showDiscover && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={showDiscover ? discoverableGroups : groups}
                    keyExtractor={item => item.id}
                    renderItem={renderGroupCard}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name={showDiscover ? "search-outline" : "people-outline"} size={48} color={Colors.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>{showDiscover ? "No groups nearby" : "No groups joined"}</Text>
                            <Text style={styles.emptySub}>
                                {showDiscover ? "Try adjusting your location or create a new group for your village." : "Join an existing community or start your own to benefit from collective booking."}
                            </Text>
                        </View>
                    }
                />
            )}

            <Modal visible={showCreateModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Agri Community</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Community Name</Text>
                        <TextInput style={styles.input} placeholder="e.g. Green Valley Farmers" value={newGroupName} onChangeText={setNewGroupName} />

                        <TouchableOpacity style={styles.detectBtn} onPress={autoDetectLocation} disabled={detectingLocation}>
                            {detectingLocation ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="location" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.detectBtnText}>Auto-fill from GPS</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Village</Text>
                                <TextInput style={styles.input} placeholder="Village name" value={village} onChangeText={setVillage} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>District</Text>
                                <TextInput style={styles.input} placeholder="District" value={district} onChangeText={setDistrict} />
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>Participation Radius (KM)</Text>
                        <TextInput style={styles.input} placeholder="10" value={radiusLimit} onChangeText={setRadiusLimit} keyboardType="numeric" />

                        <TouchableOpacity 
                          style={[styles.submitBtn, actionLoading && { opacity: 0.7 }]} 
                          onPress={handleCreateGroup} 
                          disabled={actionLoading}
                        >
                            <Text style={styles.submitBtnText}>{actionLoading ? 'Creating...' : 'Create Community'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: Spacing.m,
        paddingTop: Platform.OS === 'ios' ? 48 : 20,
        paddingBottom: 16,
        backgroundColor: Colors.cream,
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 0,
        ...Shadows.soft,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: Colors.forestGreen },
    headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
    createBtn: { 
        backgroundColor: Colors.forestGreen, flexDirection: 'row', 
        alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, 
        borderRadius: BorderRadius.round 
    },
    createBtnText: { color: Colors.cream, fontWeight: '800', fontSize: 13, marginLeft: 4 },

    tabBar: { 
        flexDirection: 'row', 
        backgroundColor: Colors.cream, 
        borderBottomWidth: 0,
        position: Platform.OS === 'web' ? 'sticky' : 'relative',
        top: 0,
        zIndex: 40,
        backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : 'none',
        borderBottomColor: 'rgba(26, 77, 58, 0.1)',
    },
    tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
    activeTabText: { color: Colors.forestGreen },
    tabIndicator: { position: 'absolute', bottom: 0, height: 3, width: 40, backgroundColor: Colors.forestGreen, borderRadius: 1.5 },

    listContent: { padding: Spacing.m, paddingBottom: 100, alignSelf: 'center', width: '100%', maxWidth: 800 },
    groupCard: {
        backgroundColor: Colors.cream, borderRadius: 16,
        padding: 16, marginBottom: 16, ...Shadows.medium,
        borderWidth: 0
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.infoLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    groupName: { fontSize: 16, fontWeight: '900', color: Colors.forestGreen },
    groupLoc: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
    leaderBadge: { backgroundColor: Colors.infoLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    leaderBadgeText: { fontSize: 9, fontWeight: '900', color: Colors.info },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E8E3DC', paddingTop: 12 },
    statRow: { flexDirection: 'row', alignItems: 'center' },
    statText: { fontSize: 12, color: Colors.textMuted, marginLeft: 4, fontWeight: '600' },
    joinBtnSmall: { backgroundColor: Colors.forestGreen, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    joinBtnTextSmall: { color: Colors.cream, fontSize: 11, fontWeight: '800' },
    btnDisabled: { backgroundColor: Colors.neutralLight },

    emptyContainer: { paddingVertical: 80, alignItems: 'center' },
    emptyIconContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.infoLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: Colors.forestGreen },
    emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 77, 58, 0.4)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: Colors.cream, borderRadius: 20, padding: 24, ...Shadows.strong },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.forestGreen },
    inputLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { height: 48, backgroundColor: '#F5F0E8', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E8E3DC', marginBottom: 16, fontSize: 14, fontWeight: '600', color: Colors.forestGreen },
    detectBtn: { padding: 12, backgroundColor: Colors.infoLight, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
    detectBtnText: { color: Colors.info, fontWeight: '700', fontSize: 13 },
    submitBtn: { height: 50, backgroundColor: Colors.forestGreen, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, ...Shadows.medium },
    submitBtnText: { color: Colors.cream, fontSize: 15, fontWeight: '800' },
});


