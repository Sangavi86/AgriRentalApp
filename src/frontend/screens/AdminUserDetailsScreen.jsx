import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { machineService } from '../../backend/services/machineService';
import { bookingService } from '../../backend/services/bookingService';
import { Colors, Spacing } from '../theme/Theme';

export default function AdminUserDetailsScreen({ route }) {
  const { userId } = route.params;
  const [machines, setMachines] = useState([]);
  const [orders, setOrders] = useState([]); // bookings made by user (borrower)
  const [rentals, setRentals] = useState([]); // bookings received by user (owner)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubOrders = null;
    let unsubRentals = null;
    let mounted = true;
    (async () => {
      try {
        // machines listed by user
        const all = await machineService.getAllApproved();
        if (mounted) setMachines(all.filter(m => m.ownerId === userId));

        // subscriptions for bookings
        unsubOrders = bookingService.subscribeByBorrower(userId, list => {
          setOrders(list);
        });
        unsubRentals = bookingService.subscribeByOwner(userId, list => {
          setRentals(list);
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      unsubOrders && unsubOrders();
      unsubRentals && unsubRentals();
    };
  }, [userId]);

  const revenue = rentals.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);

  if (loading) return <ScreenWrapper noBackground><ActivityIndicator color={Colors.navy} /></ScreenWrapper>;

  return (
    <ScreenWrapper noBackground>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: Spacing.m }}>
        <Text style={{ fontWeight: '700', marginBottom: Spacing.s }}>Machines ({machines.length})</Text>
        {machines.map(m => (
          <View key={m.id} style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: Spacing.s }}>
            <Text style={{ fontWeight: '700' }}>{m.name}</Text>
            <Text style={{ color: Colors.textSecondary }}>{m.isAvailable ? 'Available' : 'Unavailable'}</Text>
          </View>
        ))}

        <Text style={{ fontWeight: '700', marginTop: Spacing.m }}>Orders placed ({orders.length})</Text>
        <FlatList data={orders} keyExtractor={i=>i.id} renderItem={({item}) => (
          <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: Spacing.s }}>
            <Text>{item.machineName}</Text>
            <Text style={{ color: Colors.textSecondary }}>{item.rentalStartDate} → {item.rentalEndDate}</Text>
          </View>
        )} />

        <Text style={{ fontWeight: '700', marginTop: Spacing.m }}>Rentals received ({rentals.length})</Text>
        <FlatList data={rentals} keyExtractor={i=>i.id} renderItem={({item}) => (
          <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: Spacing.s }}>
            <Text>{item.machineName} • {item.borrowerName}</Text>
            <Text style={{ color: Colors.textSecondary }}>{item.rentalStartDate} → {item.rentalEndDate}</Text>
          </View>
        )} />

        <View style={{ marginTop: Spacing.m }}>
          <Text style={{ fontWeight: '800' }}>Summary</Text>
          <Text>Total revenue generated: ₹{revenue}</Text>
          <Text>Total orders placed: {orders.length}</Text>
          <Text>Total rentals given: {rentals.length}</Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}

