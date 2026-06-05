import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../../backend/services/AuthContext';
import { bookingService } from '../../backend/services/bookingService';
import { groupBookingService } from '../../backend/services/groupBookingService';
import StatusBadge from '../components/StatusBadge';
import RatingModal from '../components/RatingModal';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';

const STATUS_ICONS = {
  pending: { name: 'time', color: '#EAB308' },
  payment_failed: { name: 'close-circle', color: '#EF4444' },
  confirmed: { name: 'checkmark-circle', color: '#10B981' },
  delivered: { name: 'cube', color: '#3B82F6' },
  driver_assigned: { name: 'person-circle', color: '#3B82F6' },
  in_use: { name: 'play-circle', color: '#8B5CF6' },
  active: { name: 'flash', color: '#8B5CF6' },
  completed: { name: 'checkmark-done-circle', color: '#10B981' },
  cancelled: { name: 'ban', color: '#EF4444' },
  gathering_requests: { name: 'people', color: '#8B5CF6' },
  scheduling: { name: 'calendar', color: '#F59E0B' },
  waiting_payment: { name: 'card', color: '#F59E0B' },
};

const GPS_STATUS_COLORS = {
  SAFE: '#10B981',
  NEAR_BOUNDARY: '#F59E0B',
  OUT_OF_RANGE: '#EF4444',
  ALERT: '#DC2626',
  NO_SIGNAL: '#6B7280',
  INACTIVE: '#9CA3AF',
  ERROR: '#EF4444',
};

export default function MyOrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [gpBookings, setGpBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rateBooking, setRateBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    
    // Subscribe to individual bookings
    const unsub1 = bookingService.subscribeByBorrower(user.uid, list => {
      setBookings(list);
    });

    // Subscribe to GP bookings where user is a member
    const unsub2 = groupBookingService.subscribeGPBookingsByMember(user.uid, list => {
      setGpBookings(list);
      setLoading(false);
    });

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
    };
  }, [user]);

  // Merge individual + GP bookings into one list
  const allOrders = [
    ...bookings.map(b => ({ ...b, _type: 'individual' })),
    ...gpBookings.map(b => ({ ...b, _type: 'group' }))
  ].sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1);

  const safeConfirm = (title, msg, onConfirm) => {
      if (Platform.OS === 'web') {
          if (window.confirm(`${title}\n\n${msg}`)) onConfirm();
      } else {
          Alert.alert(title, msg, [
              { text: "No", style: "cancel" },
              { text: "Yes, Cancel", style: "destructive", onPress: onConfirm }
          ]);
      }
  };

  const confirmCancel = (bookingId) => {
    safeConfirm(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      () => handleCancel(bookingId)
    );
  };

  const handleCancel = async (bookingId) => {
    setCancelLoading(bookingId);
    try {
      console.log('Cancelling individual booking:', bookingId);
      await bookingService.cancelBooking(bookingId);
      Alert.alert('Success', 'Booking cancelled. Your refund has been initiated.');
    } catch (e) {
      console.error('Cancel Error:', e);
      Alert.alert('Cancel Failed', e.message || 'Unknown error occurred.');
    } finally {
      setCancelLoading(null);
    }
  };

  const handleCancelGP = async (bookingId) => {
    setActionLoading(bookingId);
    try {
      console.log('Cancelling group booking:', bookingId);
      await groupBookingService.cancelGPBooking(bookingId);
      Alert.alert('Cancelled', 'Group booking has been cancelled and refunds processed.');
    } catch (e) {
      console.error('Cancel GP Error:', e);
      Alert.alert('Cancel GP Failed', e.message || 'Unknown error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Renter lifecycle actions ──
  const handleReceive = async (bookingId) => {
    setActionLoading(bookingId);
    try {
      await bookingService.receiveMachine(bookingId);
      if (Platform.OS === 'web') window.alert('Machine received! Status: Delivered');
      else Alert.alert('Received', 'Machine received successfully.');
    } catch (e) {
      if (Platform.OS === 'web') window.alert('Error: ' + e.message);
      else Alert.alert('Error', e.message);
    } finally { setActionLoading(null); }
  };

  const handleStartWork = async (bookingId) => {
    setActionLoading(bookingId);
    try {
      await bookingService.startWork(bookingId);
      if (Platform.OS === 'web') window.alert('Work started! GPS tracking active.');
      else Alert.alert('Active', 'Work started. GPS tracking is now active.');
    } catch (e) {
      if (Platform.OS === 'web') window.alert('Error: ' + e.message);
      else Alert.alert('Error', e.message);
    } finally { setActionLoading(null); }
  };

  const handleReturn = async (bookingId) => {
    setActionLoading(bookingId);
    try {
      await bookingService.returnMachine(bookingId);
      if (Platform.OS === 'web') window.alert('Machine returned! Booking complete.');
      else Alert.alert('Complete', 'Machine returned. Booking completed.');
    } catch (e) {
      if (Platform.OS === 'web') window.alert('Error: ' + e.message);
      else Alert.alert('Error', e.message);
    } finally { setActionLoading(null); }
  };

  const renderIndividualBooking = (item) => (
    <View style={styles.card}>
      <Image source={{ uri: item.machineImage }} style={styles.thumb} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.machineName}>{item.machineName}</Text>
            {item.bookingType === 'group' && (
                <View style={styles.gpBadge}><Text style={styles.gpBadgeText}>GROUP</Text></View>
            )}
        </View>

        <View style={styles.statusRow}>
          {STATUS_ICONS[item.bookingStatus] ? (
              <Ionicons name={STATUS_ICONS[item.bookingStatus].name} size={16} color={STATUS_ICONS[item.bookingStatus].color} style={{ marginRight: 6 }} />
          ) : (
              <Ionicons name="information-circle" size={16} color="#aaa" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.statusText}>{(item.bookingStatus || 'pending').replace(/_/g, ' ').toUpperCase()}</Text>
        </View>

        <Text style={styles.detail}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} /> {item.rentalStartDate} → {item.rentalEndDate}
        </Text>
        {item.timeSlot && (
            <Text style={styles.detail}>
                <Ionicons name="time-outline" size={12} color={Colors.textSecondary} /> {item.timeSlot}
            </Text>
        )}
        {item.needDriver && (
          <Text style={styles.detail}>
            <Ionicons name="car-outline" size={12} color={Colors.textSecondary} /> Operator: {item.driverId
              ? (item.driverStatus === 'accepted' ? 'Assigned' : 'Pending accept')
              : (item.targetOperators?.length > 0 ? 'Pending accept' : 'Not yet assigned')}
          </Text>
        )}

        {(item.machineAmount != null || item.driverAmount != null || item.platformFee != null) && (
          <View style={{ marginTop: 4 }}>
            {item.machineAmount != null && <Text style={styles.detail}>Machine: ₹{item.machineAmount}</Text>}
            {item.driverAmount != null && <Text style={styles.detail}>Operator: ₹{item.driverAmount}</Text>}
            {item.platformFee != null && <Text style={styles.detail}>Platform fee: ₹{item.platformFee}</Text>}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <StatusBadge type="booking" status={item.bookingStatus} />
          <StatusBadge type="payment" status={item.paymentStatus} />
        </View>

        {/* Verification Photos */}
        {(item.handoverPhotos?.length > 0 || item.returnPhotos?.length > 0) && (
          <View style={styles.mediaRow}>
            <Text style={styles.mediaTitle}>Verification Photos:</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
              {item.handoverPhotos?.map((url, idx) => (
                <Image key={`h-${idx}`} source={{ uri: url }} style={styles.miniPhoto} />
              ))}
              {item.returnPhotos?.map((url, idx) => (
                <Image key={`r-${idx}`} source={{ uri: url }} style={styles.miniPhoto} />
              ))}
            </View>
          </View>
        )}

        {item.bookingStatus === 'completed' && !item.rated && (
          <TouchableOpacity style={styles.rateBtn} onPress={() => setRateBooking(item)}>
            <Ionicons name="star" size={14} color={Colors.navy} style={{ marginRight: 4 }} />
            <Text style={styles.rateBtnText}>Rate This Experience</Text>
          </TouchableOpacity>
        )}
        {item.bookingStatus === 'completed' && item.rated && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Ionicons name="checkmark-done" size={16} color="#10B981" />
              <Text style={[styles.ratedTag, { marginTop: 0, marginLeft: 4 }]}>Rated</Text>
          </View>
        )}

        {['pending', 'confirmed'].includes(item.bookingStatus) && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => confirmCancel(item.id)}
            disabled={cancelLoading === item.id}
          >
            {cancelLoading === item.id ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="close" size={14} color="#EF4444" />
                  <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Renter Lifecycle Buttons */}
        {/* Show 'Receive Machine' only after machine has been dispatched */}
        {item.bookingStatus === 'dispatched' && (
          <TouchableOpacity
            style={[styles.lifecycleBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => handleReceive(item.id)}
            disabled={actionLoading === item.id}
          >
            {actionLoading === item.id ? <ActivityIndicator color="#fff" size="small" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="cube" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.lifecycleBtnText}>Receive Machine</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Driver Blockade Notice — before dispatch */}
        {['confirmed', 'driver_assigned'].includes(item.bookingStatus) && item.needDriver && item.driverStatus !== 'accepted' && (
          <View style={[styles.lifecycleBtn, { backgroundColor: '#F59E0B', opacity: 0.8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="time" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.lifecycleBtnText}>Waiting for Driver</Text>
              </View>
          </View>
        )}

        {/* Confirmed but no driver required: show 'Awaiting Dispatch' info */}
        {['confirmed', 'driver_assigned'].includes(item.bookingStatus) && !item.needDriver && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginTop: 8 }}>
            <Ionicons name="time" size={14} color="#3B82F6" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 11, color: '#1D4ED8', fontWeight: '700' }}>Awaiting Owner Dispatch</Text>
          </View>
        )}

        {item.bookingStatus === 'delivered' && (
          <TouchableOpacity
            style={[styles.lifecycleBtn, { backgroundColor: '#8B5CF6' }]}
            onPress={() => handleStartWork(item.id)}
            disabled={actionLoading === item.id}
          >
            {actionLoading === item.id ? <ActivityIndicator color="#fff" size="small" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="play-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.lifecycleBtnText}>Start Work</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {(item.bookingStatus === 'active' || item.bookingStatus === 'in_use') && (
          <TouchableOpacity
            style={[styles.lifecycleBtn, { backgroundColor: '#10B981' }]}
            onPress={() => handleReturn(item.id)}
            disabled={actionLoading === item.id}
          >
            {actionLoading === item.id ? <ActivityIndicator color="#fff" size="small" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-done-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.lifecycleBtnText}>Return Machine</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* GPS Status (for dispatched and active bookings with GPS) */}
        {['dispatched', 'active', 'delivered', 'in_use'].includes(item.bookingStatus) && (
          <View style={[styles.gpsBadge, { backgroundColor: (GPS_STATUS_COLORS[item.gpsStatus || 'NO_SIGNAL'] || '#6B7280') + '20' }]}>
            <Ionicons name="location" size={12} color={GPS_STATUS_COLORS[item.gpsStatus || 'NO_SIGNAL'] || '#6B7280'} />
            <Text style={[styles.gpsText, { color: GPS_STATUS_COLORS[item.gpsStatus || 'NO_SIGNAL'] || '#6B7280' }]}>
              GPS: {(item.gpsStatus || 'NO_SIGNAL').replace(/_/g, ' ')}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.amount}>₹{item.totalAmount}</Text>
    </View>
  );

  const renderGPBooking = (item) => {
    const myPayment = item.payments?.find(p => p.farmerId === user.uid);
    const mySlot = item.timeSlots?.find(s => s.farmerId === user.uid);
    
    return (
      <TouchableOpacity 
        style={[styles.card, styles.gpCard]} 
        onPress={() => navigation?.navigate('GroupBooking', { bookingId: item.id })}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.machineName}>{item.machineName}</Text>
            <View style={styles.gpBadge}><Text style={styles.gpBadgeText}>GROUP</Text></View>
          </View>

          <View style={styles.statusRow}>
            {STATUS_ICONS[item.status] ? (
                <Ionicons name={STATUS_ICONS[item.status].name} size={16} color={STATUS_ICONS[item.status].color} style={{ marginRight: 6 }} />
            ) : (
                <Ionicons name="information-circle" size={16} color="#aaa" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.statusText}>{(item.status || 'pending').replace(/_/g, ' ').toUpperCase()}</Text>
          </View>

          <Text style={styles.detail}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} /> {item.bookingDate}
          </Text>
          <Text style={styles.detail}>
              <Ionicons name="time-outline" size={12} color={Colors.textSecondary} /> {item.totalDuration}h · ₹{item.baseHourlyRate}/hr
          </Text>
          
          {mySlot && (
            <Text style={styles.detail}>
              <Ionicons name="stopwatch-outline" size={12} color={Colors.textSecondary} /> Your slot: {mySlot.startTime} - {mySlot.endTime} ({mySlot.hours}h)
            </Text>
          )}
          
          {myPayment && (
            <Text style={[styles.detail, { color: myPayment.paid ? Colors.success : Colors.error, fontWeight: '600' }]}>
              <Ionicons name="card-outline" size={14} color={myPayment.paid ? Colors.success : Colors.error} /> {myPayment.refunded ? 'Refunded' : (myPayment.paid ? `Paid ₹${myPayment.amount}` : `Pending: ₹${myPayment.amount}`)}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge type="booking" status={item.status} />
            
            {/* Leader Cancel Button for Group */}
            {item.leaderId === user.uid && !['completed', 'cancelled'].includes(item.status) && (
              <TouchableOpacity
                style={styles.gpCancelBtn}
                onPress={() => {
                  Alert.alert(
                    'Cancel Group Booking',
                    'Are you sure you want to cancel the entire group booking? All members will be refunded.',
                    [
                      { text: 'No' },
                      { text: 'Yes, Cancel', style: 'destructive', onPress: () => handleCancelGP(item.id) }
                    ]
                  );
                }}
              >
                <Text style={styles.gpCancelText}>Cancel GP</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.viewDetails}>Tap to view details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    if (item._type === 'group') {
      return renderGPBooking(item);
    }
    return renderIndividualBooking(item);
  };

  if (loading) return (
    <ScreenWrapper>
      <ActivityIndicator color={Colors.forestGreen} size="large" style={{ marginTop: 60 }} />
    </ScreenWrapper>
  );

  return (
    <ScreenWrapper noPadding>
      <FlatList
        data={allOrders}
        keyExtractor={(i, idx) => i.id + '_' + idx}
        renderItem={renderItem}
        contentContainerStyle={{ 
          padding: Spacing.m, 
          paddingBottom: 120,
          maxWidth: 800,
          alignSelf: 'center',
          width: '100%',
        }}
        ListHeaderComponent={() => (
          <Text style={styles.pageTitle}>My Orders</Text>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={Colors.forestGreen} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySubtitle}>
              Start by searching for a machine or joining a group farming initiative on your nearby farms.
            </Text>
            <TouchableOpacity 
              style={styles.emptyActionBtn}
              onPress={() => navigation?.navigate('Home')}
            >
              <Ionicons name="search" size={16} color={Colors.cream} style={{ marginRight: 6 }} />
              <Text style={styles.emptyActionText}>Find a Machine</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {rateBooking && (
        <RatingModal
          visible={!!rateBooking}
          booking={rateBooking}
          raterId={user?.uid}
          targetId={rateBooking.machineId}
          targetType="machine"
          onClose={() => setRateBooking(null)}
          onSubmitted={() => setRateBooking(null)}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  pageTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: Colors.forestGreen, 
    marginBottom: Spacing.l,
    letterSpacing: -0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.m,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.forestGreen,
    marginTop: Spacing.l,
    marginBottom: Spacing.s,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.l,
    lineHeight: 21,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.forestGreen,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.card,
    marginTop: Spacing.m,
  },
  emptyActionText: {
    color: Colors.cream,
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    padding: Spacing.m,
    backgroundColor: Colors.cream, 
    borderRadius: BorderRadius.card, 
    marginBottom: Spacing.s, 
    borderWidth: 0,
    ...Shadows.soft,
  },
  gpCard: {
    borderLeftWidth: 3, 
    borderLeftColor: Colors.infoLight,
  },
  thumb: { width: 72, height: 56, borderRadius: 8, backgroundColor: Colors.greyBg },
  machineName: { fontWeight: '700', color: Colors.forestGreen, fontSize: 14, marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusIcon: { fontSize: 14, marginRight: 4 },
  statusText: { fontSize: 11, fontWeight: '800', color: Colors.forestGreen, letterSpacing: 0.5 },
  detail: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  amount: { fontWeight: '800', color: Colors.forestGreen, fontSize: 15, marginLeft: 8 },
  rateBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#C5A059', 
    paddingVertical: 7, 
    paddingHorizontal: 12,
    borderRadius: 8, 
    marginTop: 8, 
    alignSelf: 'flex-start',
  },
  rateBtnText: { color: Colors.cream, fontWeight: '700', fontSize: 12 },
  ratedTag: { fontSize: 11, color: '#10B981', fontWeight: '700', marginTop: 6 },
  cancelBtn: {
    marginTop: 10, 
    paddingVertical: 6, 
    paddingHorizontal: 10,
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: Colors.errorLight, 
    alignSelf: 'flex-start',
  },
  cancelBtnText: { fontSize: 10, fontWeight: '700', color: Colors.error },
  gpBadge: { 
    backgroundColor: Colors.infoLight, 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4 
  },
  gpBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.info },
  viewDetails: { 
    fontSize: 11, 
    color: Colors.forestGreen, 
    fontWeight: '600', 
    marginTop: 8 
  },
  mediaRow: { marginTop: 8 },
  mediaTitle: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700' },
  miniPhoto: { width: 36, height: 36, borderRadius: 4, backgroundColor: Colors.greyBg },
  lifecycleBtn: {
    marginTop: 8, 
    paddingVertical: 8, 
    paddingHorizontal: 12,
    borderRadius: BorderRadius.card, 
    alignSelf: 'flex-start',
  },
  lifecycleBtnText: { fontSize: 11, fontWeight: '700', color: Colors.cream },
  gpsBadge: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    marginTop: 8, 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 6, 
    alignSelf: 'flex-start',
  },
  gpsText: { fontSize: 10, fontWeight: '700' },
  gpCancelBtn: {
    backgroundColor: Colors.errorLight, 
    paddingHorizontal: 10, 
    paddingVertical: 5,
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: '#FECACA', 
    marginLeft: 8
  },
  gpCancelText: { color: Colors.error, fontSize: 11, fontWeight: '700' },
});

