import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { bookingService } from '../../backend/services/bookingService';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';

export default function PaymentScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const b = await bookingService.getById(bookingId);
        setBooking(b);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetch();
  }, [bookingId]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Booking Created</Text>
            <Text>Booking ID: {bookingId}</Text>
            <Text style={styles.note}>Payment simulated – booking is pending confirmation.</Text>
            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('FarmerBookings')}>
              <Text style={styles.btnText}>Go to My Listings</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.m },
  card: { backgroundColor: '#fff', padding: Spacing.l, borderRadius: BorderRadius.l, ...Shadows.soft, width: '90%' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: Spacing.s },
  note: { marginVertical: Spacing.m },
  btn: { backgroundColor: Colors.navy, padding: Spacing.m, borderRadius: BorderRadius.m, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
