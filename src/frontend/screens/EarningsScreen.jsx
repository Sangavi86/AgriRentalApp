import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, BorderRadius, Shadows, FontSize, WebStyles } from '../theme/Theme';
import { useAuth } from '../../backend/services/AuthContext';
import { bookingService } from '../../backend/services/bookingService';

const TransactionItem = ({ item, index }) => {
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed': return { label: 'Credited', bg: '#E6F0EC', text: '#1A4D3A' };
      case 'cancelled': 
        return item.refundAmount > 0 
          ? { label: 'Refunded', bg: '#FFF4E5', text: '#B45309' }
          : { label: 'Cancelled', bg: '#FEE2E2', text: '#B91C1C' };
      case 'pending':
      case 'confirmed':
      case 'dispatched':
      case 'delivered':
      case 'active':
        return { label: 'Processing', bg: '#F0F9FF', text: '#0369A1' };
      default: return { label: (status || 'unknown').toUpperCase(), bg: '#F1F5F9', text: '#475569' };
    }
  };

  const display = getStatusDisplay(item.bookingStatus);

  return (
    <View
      className="premium-card"
      style={[
        styles.transactionCard,
        Platform.OS === 'web' && WebStyles.staggeredListItem(index),
        { borderWidth: 2, borderColor: 'transparent' }
      ]}
    >
      <View style={styles.cardInfo}>
        <Text style={styles.itemName}>{item.machineName}</Text>
        <Text style={styles.itemDate}>
          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>

      <View style={styles.cardAction}>
        <Text style={styles.amountText}>₹{(item.totalAmount || 0).toLocaleString()}</Text>
        <View style={[styles.statusPill, { backgroundColor: display.bg }]}>
          <Text style={[styles.statusText, { color: display.text }]}>
            {display.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function EarningsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [balance, setBalance] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(0);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = bookingService.subscribeByOwner(user.uid, (list) => {
      setBookings(list);
      
      // Calculate earnings from completed bookings
      const totalEarned = list
        .filter(b => b.bookingStatus === 'completed')
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      
      setBalance(totalEarned);

      // Trigger "Slam" (Pulse) if new record arrives
      if (list.length > prevCount.current && prevCount.current !== 0) {
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.spring(pulseAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();
      }
      prevCount.current = list.length;
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (loading) {
    return (
      <ScreenWrapper style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noPadding>
      <View style={WebStyles.stickyHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Earnings</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={() => (
          <Animated.View style={[styles.balanceCard, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>₹{balance.toLocaleString()}</Text>
            <View style={styles.balanceDecor}>
               <Ionicons name="trending-up" size={48} color="rgba(255, 255, 255, 0.1)" />
            </View>
          </Animated.View>
        )}
        renderItem={({ item, index }) => <TransactionItem item={item} index={index} />}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 70,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: 100,
  },
  balanceCard: {
    backgroundColor: Colors.forestGreen,
    borderRadius: 24,
    padding: 30,
    marginBottom: 32,
    ...Shadows.strong,
    position: 'relative',
    overflow: 'hidden',
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceAmount: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '900',
    marginTop: 8,
  },
  balanceDecor: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  transactionCard: {
    backgroundColor: '#FDFBF6',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemName: {
    fontWeight: '700',
    color: Colors.forestGreen,
    fontSize: 16,
  },
  itemDate: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  cardAction: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.forestGreen,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
