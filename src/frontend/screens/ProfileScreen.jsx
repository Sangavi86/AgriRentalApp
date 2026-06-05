import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../backend/firebase/config';
import { useAuth } from '../../backend/services/AuthContext';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, BorderRadius, Shadows, FontSize } from '../theme/Theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile fields
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [village, setVillage] = useState('');
    const [district, setDistrict] = useState('');
    const [role, setRole] = useState('');
    const [capabilities, setCapabilities] = useState([]);

    const skillOptions = ['Tractor 🚜', 'Harvester 🌾', 'Drone 🚁', 'Baler 🧺', 'Plow 🛠️', 'Seeder 🌱', 'Loader 🏗️'];

    useEffect(() => {
        if (user?.uid) {
            loadUserProfile();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadUserProfile = async () => {
        try {
            const userRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                const data = snap.data();
                setName(data.name || user.displayName || '');
                setPhone(data.phoneNumber || user.phoneNumber || '');
                setVillage(data.village || '');
                setDistrict(data.district || '');
                setRole(data.role || '');
                setCapabilities(data.capabilities || []);
                
                if (data.role === 'driver') {
                    const driverRef = doc(db, 'drivers', user.uid);
                    const driverSnap = await getDoc(driverRef);
                    if (driverSnap.exists()) {
                        setCapabilities(driverSnap.data().capabilities || []);
                    }
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.uid) return;
        setSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                name,
                village,
                district,
                capabilities: role === 'driver' ? capabilities : []
            });
            
            if (role === 'driver') {
                const driverRef = doc(db, 'drivers', user.uid);
                await updateDoc(driverRef, {
                    name,
                    district,
                    capabilities
                }).catch(() => {});
            }
            Alert.alert('Success', 'Profile updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.agriGreen} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper noPadding>
            {/* Custom Header */}
            <View style={styles.stickyHeader}>
                <View style={styles.headerInner}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Account Settings</Text>
                    <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.centeredContent}>
                    
                    {/* Hero Profile Block */}
                    <View style={styles.heroBlock}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitial}>{name ? name[0].toUpperCase() : 'U'}</Text>
                        </View>
                        <Text style={styles.heroName}>{name || 'Valued Member'}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{(role || 'User').toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Personal Details</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput 
                                style={styles.input} 
                                value={name} 
                                onChangeText={setName} 
                                placeholder="Edit your name"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone (Verified)</Text>
                            <View style={[styles.input, styles.readOnly]}>
                                <Text style={styles.readOnlyText}>{phone || 'Not provided'}</Text>
                                <Ionicons name="shield-checkmark" size={16} color={Colors.agriGreen} />
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Location</Text>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Village</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={village} 
                                    onChangeText={setVillage} 
                                    placeholder="Add village"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>District</Text>
                                <TextInput 
                                    style={styles.input} 
                                    value={district} 
                                    onChangeText={setDistrict} 
                                    placeholder="Add district"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                        </View>

                        {role === 'driver' && (
                            <>
                                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Operator Capabilities</Text>
                                <View style={styles.skillsGrid}>
                                    {skillOptions.map(skill => (
                                        <TouchableOpacity 
                                            key={skill}
                                            style={[styles.skillChip, capabilities.includes(skill) && styles.skillChipActive]}
                                            onPress={() => {
                                                if (capabilities.includes(skill)) {
                                                    setCapabilities(capabilities.filter(c => c !== skill));
                                                } else {
                                                    setCapabilities([...capabilities, skill]);
                                                }
                                            }}
                                        >
                                            <Text style={[styles.skillText, capabilities.includes(skill) && styles.skillTextActive]}>
                                                {skill}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="#FFF" /> : (
                                <>
                                    <Text style={styles.saveBtnText}>Update Profile</Text>
                                    <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.appInfo}>FarmEquipConnect Version 2.4.0 (Premium)</Text>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    stickyHeader: {
        backgroundColor: '#FFF', paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10, ...Shadows.soft
    },
    headerInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, maxWidth: 800, alignSelf: 'center', width: '100%' },
    backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
    logoutIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

    scrollContent: { paddingVertical: 32, paddingHorizontal: 20 },
    centeredContent: { alignSelf: 'center', width: '100%', maxWidth: 800 },
    
    heroBlock: { alignItems: 'center', marginBottom: 32 },
    avatarCircle: { width: 90, height: 90, borderRadius: 30, backgroundColor: Colors.agriGreenLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...Shadows.soft },
    avatarInitial: { fontSize: 36, fontWeight: '900', color: Colors.agriGreen },
    heroName: { fontSize: 24, fontWeight: '900', color: Colors.primary },
    roleBadge: { backgroundColor: Colors.agriGreen, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
    roleBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },

    card: {
        backgroundColor: '#FFF', borderRadius: BorderRadius.l,
        padding: 24, ...Shadows.strong, borderWidth: 1, borderColor: '#F1F5F9'
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginBottom: 16 },
    
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: '#F8FAFC', borderRadius: BorderRadius.m,
        borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16,
        paddingVertical: 12, fontSize: 15, fontWeight: '600', color: Colors.primary,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
    },
    readOnly: { backgroundColor: '#F1F5F9', borderColor: 'transparent' },
    readOnlyText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
    row: { flexDirection: 'row' },

    skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    skillChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    skillChipActive: { backgroundColor: Colors.agriGreen, borderColor: Colors.agriGreen },
    skillText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
    skillTextActive: { color: '#FFF' },

    saveBtn: {
        backgroundColor: Colors.primary, height: 58, borderRadius: BorderRadius.m,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginTop: 24, ...Shadows.soft
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    
    appInfo: { textAlign: 'center', marginTop: 32, fontSize: 12, color: Colors.textSecondary, fontWeight: '500' }
});

