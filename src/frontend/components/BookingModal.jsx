import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, TextInput,
  Alert, ActivityIndicator, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, FontSize } from '../theme/Theme';
import { bookingService } from '../../backend/services/bookingService';
import { safeAlert } from '../utils/safeAlert';

const TIME_SLOTS = ['6AM–10AM', '10AM–2PM', '2PM–6PM', '6PM–10PM'];

// Returns 3 days from today as YYYY-MM-DD string
const minBookingDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
};

export default function BookingModal({ visible, onClose, machine, onConfirm, onSuccess, prefillCoords, isNearby, needDriver }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [rentalHours, setRentalHours] = useState('1');
  const [checking, setChecking] = useState(false);
  const [dateError, setDateError] = useState('');

  // Helper: check if a YYYY-MM-DD date is at least 3 days from now
  const isDateValid = (dateStr) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    minDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(d);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate >= minDate;
  };

  const [boundary, setBoundary] = useState({
    lat: '',
    lng: '',
    radius: '5'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConflict, setIsConflict] = useState(false);

  // 1. Sync boundary when prefill arrive OR visible changes
  useEffect(() => {
    if (visible && isNearby) {
      if (prefillCoords && prefillCoords.lat && prefillCoords.lng) {
        console.log('Syncing BookingModal with prefillCoords:', prefillCoords);
        setBoundary(prev => ({
          ...prev,
          lat: prefillCoords.lat.toString(),
          lng: prefillCoords.lng.toString(),
        }));
      }
    }
  }, [visible, isNearby, prefillCoords]);

  // 2. Reset other fields on open (only those not set by initial state)
  useEffect(() => {
    if (!visible) return;
    const minDate = minBookingDateStr();
    setStartDate(minDate);
    setEndDate(minDate);
    setTimeSlot(TIME_SLOTS[0]);
    setRentalHours('1');
    setError('');
    // Note: boundary reset happens in the other useEffect
    if (!isNearby) {
      setBoundary({ lat: '', lng: '', radius: '5' });
    }
  }, [visible, isNearby]);

  if (!machine) return null;

  const hourlyRate = machine.basePay || machine.rate || machine.pricePerDay || 0;
  const operatorFee = needDriver ? 200 : 0;
  const hours = Math.max(1, Number(rentalHours) || 1);

  // Multi-day cost: hours × rate × days (days = endDate - startDate + 1)
  const calcDays = () => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s) || isNaN(e) || e < s) return 1;
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  };
  const durationDays = calcDays();
  const totalAmount = (hourlyRate + operatorFee) * hours * durationDays;

  const handleConfirm = () => {
    if (!startDate || !endDate || !timeSlot) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!isDateValid(startDate)) {
      setError('Booking must be at least 3 days after today.');
      return;
    }
    // Call central validation logic
    const validation = bookingService.validateInputs({
      startDate,
      endDate,
      timeSlot,
      rentalHours: hours
    });

    if (!validation.ok) {
      setError(validation.reason);
      return;
    }

    if (machine.hasGPS && (!boundary.lat || !boundary.lng)) {
      setError('Operational boundary is required for this machine.');
      return;
    }

    onConfirm({
      rentalStartDate: startDate,
      rentalEndDate: endDate,
      timeSlot,
      totalDays: durationDays,
      totalAmount,
      boundary
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.header}>Confirm Your Booking</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Start Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, dateError ? { borderColor: '#EF4444' } : null]}
                value={startDate}
                onChangeText={(v) => {
                  setStartDate(v);
                  if (v.length === 10) {
                    if (!isDateValid(v)) {
                      setDateError('Must be at least 3 days from today.');
                    } else {
                      setDateError('');
                    }
                  } else {
                    setDateError('');
                  }
                }}
                placeholder="2026-03-28"
                placeholderTextColor="#aaa"
              />
              {dateError ? <Text style={{ fontSize: 10, color: '#EF4444', marginTop: 2 }}>⚠️ {dateError}</Text> : null}
            </View>

            {/* End Date */}
            <View style={styles.field}>
              <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-03-17"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Time Slot Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Select Time Slot *</Text>
              <View style={styles.slotGrid}>
                {TIME_SLOTS.map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotBtn, timeSlot === slot && styles.slotBtnActive]}
                    onPress={() => setTimeSlot(slot)}
                  >
                    <Text style={[styles.slotText, timeSlot === slot && styles.slotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Duration */}
            <View style={styles.field}>
              <Text style={styles.label}>Rental Duration (Hours)</Text>
              <TextInput
                style={styles.input}
                value={rentalHours}
                onChangeText={setRentalHours}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* GPS Boundary */}
            {machine.hasGPS && (
              <>
                <View style={[styles.notice, { backgroundColor: '#E0F2FE', borderLeftColor: '#38BDF8' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Ionicons name="location" size={14} color="#0284C7" style={{ marginTop: 2, marginRight: 6 }} />
                    <Text style={[styles.noticeText, { color: '#0369A1', flex: 1 }]}>
                      This machine has GPS tracking. Please set the operational boundary.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.field}>
                    <Text style={styles.label}>Delivery Boundary (Lat, Lng) *</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <TextInput 
                          style={[styles.input, { flex: 1, marginRight: 5 }]} 
                          value={boundary.lat} 
                          onChangeText={(v) => setBoundary(b => ({...b, lat: v}))} 
                          placeholder="Latitude" 
                          keyboardType="numeric" 
                        />
                        <TextInput 
                          style={[styles.input, { flex: 1, marginLeft: 5 }]} 
                          value={boundary.lng} 
                          onChangeText={(v) => setBoundary(b => ({...b, lng: v}))} 
                          placeholder="Longitude" 
                          keyboardType="numeric" 
                        />
                    </View>
                    {isNearby && (!boundary.lat || !boundary.lng) && (
                      <Text style={styles.gpsHint}>📍 Waiting for GPS coordinates...</Text>
                    )}
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Boundary Radius (Km) *</Text>
                    <TextInput 
                      style={styles.input} 
                      value={boundary.radius} 
                      onChangeText={(v) => setBoundary(b => ({...b, radius: v}))} 
                      placeholder="5" 
                      keyboardType="numeric" 
                    />
                </View>
              </>
            )}

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryLine}>Rate: ₹{hourlyRate}/hr × {hours} hours</Text>
              {needDriver && <Text style={styles.summaryLine}>Operator: ₹200/hr × {hours} hours</Text>}
              <Text style={styles.summaryTotal}>Total: ₹{totalAmount}</Text>
            </View>

            {/* Notice */}
            <View style={styles.notice}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.navy} />
                <Text style={styles.infoText}>
                  Bookings must be made at least 3 days in advance.
                </Text>
              </View>
            </View>

            {/* Buttons */}
            {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}
            <View style={styles.buttonsRow}>
              <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose} disabled={checking}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.confirm, (checking || !timeSlot) && styles.btnDisabled]}
                onPress={handleConfirm}
                disabled={checking}
              >
                {checking
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnText}>Confirm</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 15,
  },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: '#fff',
    borderRadius: 15, padding: 12, ...Shadows.strong,
    maxHeight: '80%',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  header: {
    fontSize: 15, fontWeight: '900', color: Colors.navy,
  },
  closeBtn: { padding: 4 },
  field: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 3 },
  input: {
    borderWidth: 1, borderColor: '#EEE', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: Colors.navy, backgroundColor: '#F9FAFB',
  },
  slotGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  slotBtn: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  slotBtnActive: {
    backgroundColor: Colors.navy, borderColor: Colors.navy,
  },
  slotText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  slotTextActive: { color: '#FFF' },
  notice: {
    backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: '#F59E0B', marginBottom: 12,
  },
  noticeText: { fontSize: 11, color: '#92400E', lineHeight: 16 },
  summary: {
    backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  summaryLine: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  summaryTotal: { fontSize: 15, fontWeight: '900', color: Colors.navy, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 11, color: Colors.navy, fontWeight: '600' },
  buttonsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  cancel: { backgroundColor: '#94A3B8' },
  confirm: { backgroundColor: Colors.navy },
  btnDisabled: { opacity: 0.5 },
  errorText: { color: Colors.error, fontSize: 12, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  gpsHint: { fontSize: 10, color: Colors.gold, fontWeight: '700', marginTop: 4, fontStyle: 'italic' },
});
