import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Switch, Dimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ScreenWrapper from '../components/ScreenWrapper';
import { machineService } from '../../backend/services/machineService';
import { useAuth } from '../../backend/services/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../theme/Theme';
import { safeAlert } from '../utils/safeAlert';

const { width } = Dimensions.get('window');

export default function AddMachineScreen({ navigation, route }) {
    const { user } = useAuth();
    const machineId = route?.params?.machineId;
    const isEdit = !!machineId;
    
    // State
    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [price, setPrice] = useState('');
    const [desc, setDesc] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [village, setVillage] = useState('');
    const [district, setDistrict] = useState('');
    const [stateLoc, setStateLoc] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');
    const [driverIncluded, setDriverIncluded] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    const [hasGPS, setHasGPS] = useState(false);
    const [locLoading, setLocLoading] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (navigation && navigation.setOptions) {
            navigation.setOptions({ 
                title: isEdit ? 'Edit Machine' : 'List Machine',
                headerShown: true,
                headerStyle: { backgroundColor: '#FFF' },
                headerTintColor: Colors.primary,
                headerTitleStyle: { fontWeight: '800' }
            });
        }
    }, [navigation, isEdit]);

    useEffect(() => {
        if (isEdit) {
            (async () => {
                setLoading(true);
                try {
                    const m = await machineService.getById(machineId);
                    if (m) {
                        setName(m.name || '');
                        setType(m.type || '');
                        setPrice((m.basePay || m.rate || '').toString());
                        setDesc(m.description || '');
                        setImageUrl(m.imageUrl || '');
                        setVillage(m.location?.village || '');
                        setDistrict(m.location?.district || '');
                        setStateLoc(m.location?.state || '');
                        setLat(m.location?.lat != null ? String(m.location.lat) : '');
                        setLng(m.location?.lng != null ? String(m.location.lng) : '');
                        setDriverIncluded(!!m.driverIncluded);
                        setIsAvailable(m.isAvailable !== false);
                        setHasGPS(!!m.hasGPS);
                    }
                } catch (e) {
                    safeAlert('Error', 'Failed to load machine.');
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [isEdit, machineId]);

    const fetchGPS = async () => {
        setLocLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                safeAlert('Permission Denied', 'Enable location to auto-fill coordinates.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setLat(String(pos.coords.latitude.toFixed(6)));
            setLng(String(pos.coords.longitude.toFixed(6)));
        } catch (e) {
            safeAlert('Error', 'Could not get location. Enter manually.');
        } finally {
            setLocLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim() || !type.trim() || !price.trim()) { 
            safeAlert('Error', 'Please fill in required fields'); 
            return; 
        }
        const hourlyRate = parseInt(price);
        if (isNaN(hourlyRate) || hourlyRate <= 0) {
            safeAlert('Error', 'Please enter a valid hourly rate');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name,
                type: type || 'Tractor',
                basePay: hourlyRate,
                distanceKm: 0,
                description: desc,
                imageUrl: imageUrl || 'https://images.unsplash.com/photo-1594910628359-59844be9629b?q=80&w=1978',
                location: {
                    village,
                    district,
                    state: stateLoc,
                    lat: parseFloat(lat) || null,
                    lng: parseFloat(lng) || null,
                },
                driverIncluded,
                isAvailable,
                hasGPS,
                updatedAt: new Date().toISOString()
            };
            if (isEdit) {
                await machineService.update(machineId, payload);
                safeAlert('Success', 'Machine updated successfully');
            } else {
                await machineService.add({ ...payload, status: 'pending' }, user?.uid || 'unknown', user?.displayName || user?.phoneNumber || '');
                safeAlert('Success', 'Machine listed! Awaiting admin approval.');
            }
            navigation.goBack();
        } catch (e) {
            safeAlert('Error', 'Action failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEdit) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.agriGreen} />
            </View>
        );
    }

    return (
        <ScreenWrapper noPadding>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.centeredContent}>
                    
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Main Details</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Machine Name *</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g. John Deere 5050D" 
                                placeholderTextColor="#94A3B8"
                                value={name} 
                                onChangeText={setName} 
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Category *</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="e.g. Tractor" 
                                    placeholderTextColor="#94A3B8"
                                    value={type} 
                                    onChangeText={setType} 
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Rate (₹/hr) *</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="e.g. 800" 
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric" 
                                    value={price} 
                                    onChangeText={setPrice} 
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                                multiline
                                placeholder="Tell farmers about your machine's condition, features, etc."
                                placeholderTextColor="#94A3B8"
                                value={desc}
                                onChangeText={setDesc}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Image URL (Optional)</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Paste an image link..." 
                                placeholderTextColor="#94A3B8"
                                value={imageUrl} 
                                onChangeText={setImageUrl} 
                            />
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Service Area</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>District *</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g. Coimbatore" 
                                placeholderTextColor="#94A3B8"
                                value={district} 
                                onChangeText={setDistrict} 
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Village</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Village name" 
                                    placeholderTextColor="#94A3B8"
                                    value={village} 
                                    onChangeText={setVillage} 
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>State</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="State name" 
                                    placeholderTextColor="#94A3B8"
                                    value={stateLoc} 
                                    onChangeText={setStateLoc} 
                                />
                            </View>
                        </View>

                        <View style={styles.locHeader}>
                            <Text style={styles.label}>GPS Coordinates</Text>
                            <TouchableOpacity style={styles.gpsBtn} onPress={fetchGPS} disabled={locLoading}>
                                {locLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="location" size={14} color="#FFF" />
                                        <Text style={styles.gpsBtnText}>Auto-detect</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={styles.row}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                placeholder="Latitude"
                                placeholderTextColor="#94A3B8"
                                value={lat}
                                onChangeText={setLat}
                                keyboardType="numeric"
                            />
                            <TextInput
                                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                placeholder="Longitude"
                                placeholderTextColor="#94A3B8"
                                value={lng}
                                onChangeText={setLng}
                                keyboardType="numeric"
                            />
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Features</Text>
                        
                        <View style={styles.featureRow}>
                            <View style={styles.featureIcon}>
                                <Ionicons name="person" size={20} color={driverIncluded ? Colors.agriGreen : '#94A3B8'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.featureLabel}>Driver Included</Text>
                                <Text style={styles.featureDesc}>Available for booking with a driver</Text>
                            </View>
                            <Switch
                                value={driverIncluded}
                                onValueChange={setDriverIncluded}
                                trackColor={{ false: '#E2E8F0', true: Colors.agriGreen }}
                                thumbColor="#FFF"
                            />
                        </View>

                        <View style={styles.featureRow}>
                            <View style={styles.featureIcon}>
                                <Ionicons name="map" size={20} color={hasGPS ? Colors.agriGreen : '#94A3B8'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.featureLabel}>GPS Tracking</Text>
                                <Text style={styles.featureDesc}>Supports live location monitoring</Text>
                            </View>
                            <Switch
                                value={hasGPS}
                                onValueChange={setHasGPS}
                                trackColor={{ false: '#E2E8F0', true: Colors.agriGreen }}
                                thumbColor="#FFF"
                            />
                        </View>

                        {isEdit && (
                            <View style={styles.featureRow}>
                                <View style={styles.featureIcon}>
                                    <Ionicons name="checkmark-circle" size={20} color={isAvailable ? Colors.agriGreen : '#EF4444'} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.featureLabel}>Currently Available</Text>
                                    <Text style={styles.featureDesc}>Visible to farmers for booking</Text>
                                </View>
                                <Switch
                                    value={isAvailable}
                                    onValueChange={setIsAvailable}
                                    trackColor={{ false: '#E2E8F0', true: Colors.agriGreen }}
                                    thumbColor="#FFF"
                                />
                            </View>
                        )}

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Text style={styles.saveBtnText}>{isEdit ? 'Update Listing' : 'List Machine'}</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.agriTint },
    scrollContent: { paddingVertical: 32, paddingHorizontal: 20 },
    centeredContent: { alignSelf: 'center', width: '100%', maxWidth: 800 },
    
    card: {
        backgroundColor: '#FFF', borderRadius: BorderRadius.l,
        padding: 24, ...Shadows.strong, borderWidth: 1, borderColor: '#F1F5F9'
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary, marginBottom: 16, marginTop: 8 },
    
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: '#F8FAFC', borderRadius: BorderRadius.m,
        borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16,
        paddingVertical: 12, fontSize: 15, fontWeight: '600', color: Colors.primary
    },
    row: { flexDirection: 'row', marginBottom: 4 },
    
    locHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 },
    gpsBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6
    },
    gpsBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

    featureRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
        padding: 16, borderRadius: BorderRadius.m, marginBottom: 12,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    featureIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, ...Shadows.soft },
    featureLabel: { fontSize: 14, fontWeight: '800', color: Colors.primary },
    featureDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

    saveBtn: {
        backgroundColor: Colors.agriGreen, height: 58, borderRadius: BorderRadius.m,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        marginTop: 24, ...Shadows.soft
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});

