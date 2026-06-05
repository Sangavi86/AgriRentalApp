import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Switch, Platform, ScrollView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../../backend/services/AuthContext';
import { bookingService } from '../../backend/services/bookingService';
import { machineService } from '../../backend/services/machineService';
import { mockGpsService } from '../../backend/services/mockGpsService';
import StatusBadge from '../components/StatusBadge';
import RatingModal from '../components/RatingModal';
import SkeletonLoader from '../components/SkeletonLoader';
import { Colors, Spacing, BorderRadius, Shadows, FontSize } from '../theme/Theme';

const { width } = Dimensions.get('window');

const GPS_STATUS_COLORS = {
  SAFE: '#10B981',
  NEAR_BOUNDARY: '#F59E0B',
  OUT_OF_RANGE: '#EF4444',
  ALERT: '#DC2626',
  NO_SIGNAL: '#6B7280',
  INACTIVE: '#9CA3AF',
  ERROR: '#EF4444',
};

const NEXT_ACTION = {
  pending: { label: 'Confirm Booking', icon: 'checkmark-circle', next: 'dispatch', color: Colors.agriGreen },
  confirmed: { label: 'Dispatch Machine', icon: 'send', next: 'dispatch', color: '#3B82F6' },
  driver_assigned: { label: 'Dispatch Machine', icon: 'send', next: 'dispatch', color: '#3B82F6' },
  active: { label: 'Confirm Return → Complete', icon: 'checkmark-done-circle', next: 'completed', color: Colors.agriGreen },
  in_use: { label: 'Confirm Return → Complete', icon: 'checkmark-done-circle', next: 'completed', color: Colors.agriGreen },
};

export default function MyRentalsScreen({ navigation }) {
  const { user } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rateBooking, setRateBooking] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);

    const unsub = bookingService.subscribeByOwner(user.uid, list => {
      setRentals(list);
      setTimeout(() => setLoading(false), 800);
      mockGpsService.startTracking(list);
    });

    let mounted = true;
    (async () => {
      try {
        const list = await machineService.getAllApproved();
        if (mounted) setMachines(list.filter(m => m.ownerId === user.uid));
      } catch (e) { console.error(e); }
    })();

    return () => { unsub && unsub(); mounted = false; };
  }, [user]);

  const toggleAvailability = async (id, current) => {
    try {
      await machineService.toggleAvailability(id, !current);
      setMachines(ms => ms.map(m => m.id === id ? { ...m, isAvailable: !current } : m));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const advanceStatus = async (item, next) => {
    if (next === 'dispatch' && item.needDriver && item.driverStatus !== 'accepted') {
      if (Platform.OS === 'web') {
          window.alert('Driver Required:\nThe driver must accept the job before you can dispatch the machine.');
      } else {
          Alert.alert('Driver Required', 'Driver must accept the job before you can dispatch the machine.');
      }
      return;
    }

    const label = next === 'completed' ? 'Complete Rental' : `Update to ${next}`;
    let confirmed = false;
    if (Platform.OS === 'web') {
        confirmed = window.confirm(`${label}?\n\nMark this booking as ${next}?`);
    } else {
        confirmed = await new Promise(res => {
            Alert.alert(`${label}?`, `Mark this booking as ${next}?`, [
              { text: 'Cancel', onPress: () => res(false) },
              { text: 'Yes', onPress: () => res(true) }
            ], { cancelable: true });
        });
    }
    if (!confirmed) return;

    setProcessingId(item.id);
    try {
      if (next === 'dispatch') {
          await bookingService.dispatchMachine(item.id);
      } else {
          await bookingService.updateStatus(item.id, next);
          if (next === 'completed') setRateBooking(item);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const renderSkeleton = () => (
      <View style={styles.centerWidth}>
          <SkeletonLoader height={24} width={150} style={{ marginBottom: 16 }} />
          {[1, 2].map(i => (
              <View key={i} style={styles.skeletonRow}>
                  <SkeletonLoader height={20} width="40%" />
                  <SkeletonLoader height={24} width={50} borderRadius={12} />
              </View>
          ))}
          <SkeletonLoader height={24} width={180} style={{ marginTop: 24, marginBottom: 16 }} />
          {[1, 2].map(i => (
              <View key={`b-${i}`} style={styles.skeletonCard} />
          ))}
      </View>
  );

  const renderRentalCard = ({ item }) => {
    const action = NEXT_ACTION[item.bookingStatus];
    return (
      <View style={styles.rentalCard}>
        <View style={styles.cardMain}>
          <Image source={{ uri: item.machineImage || 'https://via.placeholder.com/150' }} style={styles.thumb} />
          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <Text style={styles.machineName}>{item.machineName}</Text>
              <Text style={styles.amount}>₹{item.totalAmount}</Text>
            </View>
            
            <Text style={styles.borrowerName}>
              <Ionicons name="person-outline" size={10} color={Colors.textSecondary} /> Renter: {item.borrowerName || 'Farmer'}
            </Text>

            <View style={styles.dateRow}>
               <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
               <Text style={styles.dateText}>{item.rentalStartDate} → {item.rentalEndDate}</Text>
            </View>

            <View style={styles.badgeRow}>
               <StatusBadge type="booking" status={item.bookingStatus} />
               {item.needDriver && (
                  <View style={[styles.driverPill, { backgroundColor: item.driverId ? '#F0FDF4' : '#FFFBEB' }]}>
                    <Text style={[styles.driverPillText, { color: item.driverId ? '#166534' : '#92400E' }]}>
                        {item.driverId ? 'DRIVER ASSIGNED' : 'DRIVER REQ'}
                    </Text>
                  </View>
               )}
            </View>

            {/* GPS Status */}
            {['dispatched', 'active', 'delivered', 'in_use'].includes(item.bookingStatus) && (
              <View style={[styles.gpsBadge, { backgroundColor: (GPS_STATUS_COLORS[item.gpsStatus || 'NO_SIGNAL'] || '#6B7280') + '20' }]}>
                <Ionicons name="location" size={12} color={GPS_STATUS_COLORS[item.gpsStatus || 'NO_SIGNAL'] || '#6B7280'} />
                <Text style={[styles.gpsText, { color: GPS_STATUS_COLORS[item.gpsStatus || 'NO_SIGNAL'] || '#6B7280' }]}>
                  GPS: {(item.gpsStatus || 'NO_SIGNAL').replace(/_/g, ' ')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {action && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: action.color }]}
            onPress={() => advanceStatus(item, action.next)}
            disabled={processingId === item.id}
          >
            {processingId === item.id ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name={action.icon} size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>{action.label}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {item.bookingStatus === 'dispatched' && (
           <View style={styles.statusBanner}>
              <Ionicons name="time" size={14} color="#1D4ED8" style={{ marginRight: 6 }} />
              <Text style={styles.statusBannerText}>Waiting for renter to receive machine</Text>
           </View>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper noPadding>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
           <Ionicons name="chevron-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Asset Management</Text>
          <Text style={styles.headerSub}>Control your machines and tracking</Text>
        </View>
      </View>

      {loading ? (
        renderSkeleton()
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.centerWidth}>
            {/* My Machines Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Fleet</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddMachine')}>
                <Text style={styles.addText}>+ Add Machine</Text>
              </TouchableOpacity>
            </View>

            {machines.length === 0 ? (
               <View style={styles.emptyInternal}>
                  <Text style={styles.emptyInternalText}>No machines registered yet.</Text>
               </View>
            ) : (
              machines.map(m => (
                <View key={m.id} style={styles.machineRow}>
                  <View style={styles.machineInfo}>
                    <View style={styles.machineIcon}>
                        <Ionicons name="construct" size={16} color={Colors.primary} />
                    </View>
                    <View>
                        <Text style={styles.machineNameText}>{m.name}</Text>
                        <Text style={styles.machineSubText}>{m.isAvailable ? 'Visible to farmers' : 'Hidden from searches'}</Text>
                    </View>
                  </View>
                  <Switch
                    value={m.isAvailable}
                    onValueChange={() => toggleAvailability(m.id, m.isAvailable)}
                    trackColor={{ false: '#CBD5E1', true: Colors.agriGreen }}
                    thumbColor="#FFF"
                  />
                </View>
              ))
            )}

            {/* Incoming Bookings Section */}
            <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 16 }]}>Ongoing Rentals</Text>
            {rentals.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="calendar-outline" size={48} color={Colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No active rentals</Text>
                <Text style={styles.emptySub}>When farmers book your machines, they will appear here for management.</Text>
              </View>
            ) : (
              <FlatList
                data={rentals}
                keyExtractor={i => i.id}
                renderItem={renderRentalCard}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>
      )}

      {/* Rating Modal */}
      {rateBooking && (
        <RatingModal
          visible={!!rateBooking}
          booking={rateBooking}
          onClose={() => setRateBooking(null)}
          onSubmitted={() => setRateBooking(null)}
        />
      )}


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

  scrollContent: { paddingVertical: 24, paddingBottom: 120 },
  centerWidth: { alignSelf: 'center', width: '100%', maxWidth: 800, paddingHorizontal: Spacing.m },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  addText: { fontSize: 14, fontWeight: '800', color: Colors.agriGreen },

  machineRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 16, borderRadius: BorderRadius.m, marginBottom: 12,
    ...Shadows.soft, borderWidth: 1, borderColor: '#F1F5F9'
  },
  machineInfo: { flexDirection: 'row', alignItems: 'center' },
  machineIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  machineNameText: { fontSize: 15, fontWeight: '900', color: Colors.primary },
  machineSubText: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  rentalCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.m,
    marginBottom: 16, ...Shadows.soft,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden'
  },
  cardMain: { flexDirection: 'row', padding: 16 },
  thumb: { width: 80, height: 64, borderRadius: 10, backgroundColor: '#F1F5F9' },
  cardContent: { flex: 1, marginLeft: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  machineName: { fontSize: 15, fontWeight: '900', color: Colors.primary, flex: 1, marginRight: 8 },
  amount: { fontSize: 15, fontWeight: '900', color: Colors.primary },
  borrowerName: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dateText: { fontSize: 12, color: Colors.textSecondary, marginLeft: 6, fontWeight: '500' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driverPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  driverPillText: { fontSize: 9, fontWeight: '900' },

  actionBtn: { 
    marginHorizontal: 16, marginBottom: 16, height: 44, 
    borderRadius: BorderRadius.s, flexDirection: 'row', 
    alignItems: 'center', justifyContent: 'center', ...Shadows.soft 
  },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  statusBanner: { marginHorizontal: 16, marginBottom: 16, padding: 10, backgroundColor: '#EFF6FF', borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  statusBannerText: { fontSize: 11, color: '#1D4ED8', fontWeight: '800' },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  gpsText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  emptyInternal: { padding: 24, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: BorderRadius.m, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyInternalText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },

  emptyState: { paddingVertical: 48, alignItems: 'center' },
  emptyIconContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: BorderRadius.m, marginBottom: 12, ...Shadows.soft },
  skeletonCard: { height: 160, backgroundColor: '#FFF', borderRadius: BorderRadius.m, marginBottom: 16, ...Shadows.soft },
});


