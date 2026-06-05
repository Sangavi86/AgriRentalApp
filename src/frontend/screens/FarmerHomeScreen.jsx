import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Dimensions, ActivityIndicator, Alert, Platform, Modal, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../../backend/services/AuthContext';
import { useConfig } from '../../backend/services/ConfigContext';
import { Ionicons } from '@expo/vector-icons';
import { machineService } from '../../backend/services/machineService';
import MachineCard from '../components/MachineCard';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';

// ── Helpers ────────────────────────────────────────────────────────────────
const haversine = (lat1, lng1, lat2, lng2) => {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 99999;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

const ActionButton = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
        <View style={styles.actionIconContainer}>
            <Ionicons name={icon} size={18} color="#1F2937" />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

export default function FarmerHomeScreen({ navigation }) {
    const { user, logout } = useAuth();
    const { config } = useConfig();

    const [machines, setMachines] = useState([]);
    const [filteredMachines, setFilteredMachines] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [districtFilter, setDistrictFilter] = useState('All');
    const [allDistricts, setAllDistricts] = useState(['All']);
    const [showDistrictModal, setShowDistrictModal] = useState(false);
    const [useGPS, setUseGPS] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState(['All', 'Tractor', 'Sprayer', 'Trolley', 'Drone', 'Harvester', 'Loader', 'Sprinkler', 'Rotavator', 'Plough', 'Disc Plough', 'Other']);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('Home');

    const displayName = user?.name || 'Farmer';

    useEffect(() => {
        setLoading(true);
        // Use real-time listener for approved machines
        const unsubscribe = machineService.subscribeAllApproved((data) => {
            console.log('📦 Real-time sync: Loaded machines:', data.length);
            if (data.length === 0) {
                console.warn('⚠️ No approved machines found in database');
            } else {
                console.log('✅ Machines loaded successfully');
                data.forEach(m => console.log(`  - ${m.name} (${m.type})`));
            }
            setMachines(data || []);
            setLoading(false);
        }, (error) => {
            console.error('❌ Error loading machines:', error);
            Alert.alert('Error', 'Failed to load machines: ' + error.message);
            setLoading(false);
        });

        return () => unsubscribe && unsubscribe();
    }, []);

    // Fetch initial location
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let location = await Location.getCurrentPositionAsync({});
                    setUserCoords({ lat: location.coords.latitude, lng: location.coords.longitude });
                }
            } catch (e) { console.log('Location pre-fetch failed:', e); }
        })();
    }, []);

    const handleGPSToggle = async () => {
        const nextVal = !useGPS;
        setUseGPS(nextVal);
        if (!nextVal) { setUserCoords(null); return; }
        
        setGpsLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (Platform.OS === 'web') window.alert("Location permission denied. Please enable in browser settings.");
                else Alert.alert("Permission Error", "Location access is required for Nearby sorting.");
                setUseGPS(false);
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (pos && pos.coords) {
                setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                console.log('Location locked:', pos.coords.latitude, pos.coords.longitude);
            }
        } catch (e) {
            console.error('GPS Error:', e);
            setUseGPS(false);
        } finally {
            setGpsLoading(false);
        }
    };

    // Normalize machine types to match categories
    const normalizeType = (type) => {
        if (!type) return 'Other';
        const normalized = type.trim().toLowerCase();
        
        // Map variations to standard categories
        if (normalized.includes('tractor')) return 'Tractor';
        if (normalized.includes('sprayer') || normalized.includes('spray')) return 'Sprayer';
        if (normalized.includes('trolley') || normalized.includes('trolly')) return 'Trolley';
        if (normalized.includes('drone')) return 'Drone';
        if (normalized.includes('harvester')) return 'Harvester';
        if (normalized.includes('loader')) return 'Loader';
        if (normalized.includes('sprinkler')) return 'Sprinkler';
        if (normalized.includes('rotavator') || normalized.includes('rotovator')) return 'Rotavator';
        if (normalized.includes('plough') || normalized.includes('plow') || normalized.includes('disc')) return 'Plough';
        
        return 'Other';
    };

    useEffect(() => {
        // Extract unique categories and districts from machines
        const uniqueCats = new Set(['All']);
        const uniqueDistricts = new Set(['All']);

        machines.forEach(m => {
            uniqueCats.add(normalizeType(m.type));
            if (m.location?.district) {
                uniqueDistricts.add(m.location.district.trim());
            }
        });

        setCategories(Array.from(uniqueCats).sort());
        setAllDistricts(Array.from(uniqueDistricts).sort());
    }, [machines]);

    useEffect(() => {
        let res = [...machines];
        const q = search.trim().toLowerCase();
        if (q) res = res.filter(m => (m.name || '').toLowerCase().includes(q) || (m.type || '').toLowerCase().includes(q));
        
        if (selectedCategory && selectedCategory !== 'All') {
            const cat = selectedCategory.trim().toLowerCase();
            res = res.filter(m => normalizeType(m.type).toLowerCase() === cat);
        }

        if (!useGPS && districtFilter && districtFilter !== 'All') {
            const d = districtFilter.trim().toLowerCase();
            res = res.filter(m => (m.location?.district || '').toLowerCase().includes(d));
        }
        
        if (useGPS && userCoords) {
            res = res.map(m => ({
                ...m,
                _distKm: haversine(userCoords.lat, userCoords.lng, m.location?.lat, m.location?.lng)
            }));
            res.sort((a, b) => (a._distKm || 99999) - (b._distKm || 99999));
            console.log('Sorted by distance:', res.map(r => `${r.name}: ${r._distKm.toFixed(1)}km`));
        } else {
            res.sort((a, b) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1);
        }
        console.log(`🔍 Filtered machines: ${res.length} / ${machines.length} (Search: "${search}", Cat: "${selectedCategory}", Dist: "${districtFilter}")`);
        setFilteredMachines(res);
    }, [search, districtFilter, machines, useGPS, userCoords, selectedCategory]);



    const { width } = Dimensions.get('window');
    const numColumns = width >= 768 ? 3 : 2;

    return (
        <ScreenWrapper noBackground noPadding>
            <View style={styles.root}>
                <View style={styles.topSection}>
                    <View style={styles.topBar}>
                        <View style={styles.searchInputContainer}>
                            <Ionicons name="search" size={16} color="#6B7280" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search machines..."
                                placeholderTextColor="#9CA3AF"
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>

                        <TouchableOpacity style={styles.locationBtn} onPress={() => setShowDistrictModal(true)}>
                            <Text style={styles.locationText}>📍 {districtFilter || 'All'} ▼</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.avatarBtn} onPress={() => setProfileModalVisible(true)}>
                            <Text style={styles.avatarText}>{(displayName || 'U').charAt(0).toUpperCase()}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.avatarBtn, { marginLeft: 8 }]} onPress={() => Alert.alert('Filters', 'Filter/sort panel coming soon')}>
                            <Ionicons name="settings-outline" size={20} color="#1F2937" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.categoryScrollContainer}>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={categories}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
                                    onPress={() => setSelectedCategory(item)}
                                >
                                    <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.agriGreen} style={{ marginTop: 48 }} />
                ) : filteredMachines.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No machines available. Adjust filters or try later.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredMachines}
                        keyExtractor={(item) => item.id}
                        numColumns={numColumns}
                        columnWrapperStyle={{
                            paddingHorizontal: 8,
                            paddingBottom: 8,
                            justifyContent: 'flex-start',
                        }}
                        contentContainerStyle={{ 
                            paddingBottom: 120, 
                            paddingTop: 8,
                            maxWidth: 1200,
                            alignSelf: 'center',
                            width: '100%',
                        }}
                        renderItem={({ item }) => (
                            <View style={{ width: numColumns === 3 ? '33.33%' : '50%', paddingHorizontal: 4 }}>
                                <MachineCard
                                    machine={item}
                                    onPress={() => navigation.navigate('MachineDetail', { machineId: item.id })}
                                />
                            </View>
                        )}
                    />
                )}

                <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddMachine')}>
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>

                <Modal
                    visible={profileModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setProfileModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Profile</Text>
                            <Text style={styles.modalText}>{displayName}</Text>
                            <Text style={styles.modalText}>{user?.phone || 'Phone not set'}</Text>
                            <Text style={styles.modalText}>Role: {user?.role ? (user.role === 'driver' ? 'Operator' : 'Farmer') : 'Farmer'}</Text>

                            {user?.role === 'driver' ? (
                                <>
                                    <TouchableOpacity style={styles.modalOption} onPress={() => { setProfileModalVisible(false); }}>
                                        <Text style={styles.modalOptionText}>My Trips</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalOption} onPress={() => { setProfileModalVisible(false); }}>
                                        <Text style={styles.modalOptionText}>Available Jobs</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.modalOption} onPress={() => { setProfileModalVisible(false); navigation.navigate('FarmerBookings'); }}>
                                        <Text style={styles.modalOptionText}>My Listings</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.modalOption} onPress={() => { setProfileModalVisible(false); }}>
                                        <Text style={styles.modalOptionText}>My Rentals</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            <TouchableOpacity style={styles.modalOption} onPress={() => { setProfileModalVisible(false); navigation.navigate('Earnings'); }}>
                                <Text style={styles.modalOptionText}>Earnings</Text>
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

                <Modal
                    visible={showDistrictModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowDistrictModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Select District</Text>
                            <ScrollView>
                                {allDistricts.map((district) => (
                                    <TouchableOpacity
                                        key={district}
                                        style={styles.modalOption}
                                        onPress={() => {
                                            setDistrictFilter(district === 'All' ? 'All' : district);
                                            setShowDistrictModal(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.modalOptionText,
                                            districtFilter === district && { color: Colors.agriGreen, fontWeight: 'bold' }
                                        ]}>
                                            {district === 'All' ? '📍 All Districts' : `📍 ${district}`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F7F8FA' },
    topSection: {
        backgroundColor: '#FFFFFF',
        borderBottomColor: '#E5E7EB',
        borderBottomWidth: 1,
        paddingBottom: 10,
        ...Shadows.soft,
        zIndex: 10,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: Platform.OS === 'ios' ? 48 : 24,
        paddingBottom: 8,
        backgroundColor: '#fff',
    },
    searchInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        paddingHorizontal: 10,
        height: 40,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
        padding: 0,
    },
    locationBtn: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 14,
        marginRight: 6,
    },
    locationText: {
        fontSize: 12,
        color: '#1F2937',
    },
    avatarBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(26, 77, 58, 0.1)', // Changed from opacity 0.1 on whole view
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.forestGreen,
    },
    categoryScrollContainer: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: Colors.cream,
        borderBottomWidth: 0,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: Colors.cream,
        borderWidth: 2,
        borderColor: Colors.forestGreen,
        marginRight: 8,
    },
    categoryChipActive: {
        backgroundColor: Colors.forestGreen,
        borderColor: Colors.forestGreen,
    },
    categoryText: {
        fontSize: 12,
        color: Colors.forestGreen,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    categoryTextActive: {
        color: Colors.cream,
    },
    emptyState: {
        flex: 1,
        marginTop: 80,
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyStateText: {
        color: Colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 24,
    },
    fab: {
        position: 'absolute',
        bottom: 72,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.forestGreen,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.medium,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: Colors.cream,
        borderTopWidth: 0,
        borderTopColor: 'transparent',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '25%',
    },
    navLabel: {
        marginTop: 2,
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        maxHeight: '65%',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#111827',
        marginBottom: 8,
    },
    modalText: {
        fontSize: 13,
        color: '#374151',
        marginBottom: 6,
    },
    modalOption: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalOptionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
});
