import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSize } from '../theme/Theme';

export default function StatusBadge({ type = 'booking', status }) {
  const s = (status || '').toLowerCase();
  
  const getColors = () => {
    switch(s) {
      case 'active':
      case 'completed':
      case 'paid':
        return { bg: Colors.successLight, text: Colors.success };
      case 'pending':
      case 'waiting_payment':
      case 'gathering_requests':
        return { bg: Colors.warningLight, text: Colors.warning };
      case 'confirmed':
      case 'delivered':
      case 'ready_for_delivery':
      case 'scheduling':
      case 'driver_assigned':
        return { bg: Colors.infoLight, text: Colors.info };
      case 'cancelled':
      case 'failed':
        return { bg: Colors.errorLight, text: Colors.error };
      default:
        return { bg: Colors.neutralLight, text: Colors.neutral };
    }
  };

  const { bg, text } = getColors();
  const label = (status || '').replace(/_/g, ' ').toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}> 
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
      paddingHorizontal: 14, 
      paddingVertical: 6, 
      borderRadius: 20, // Fully rounded pills
      alignSelf: 'flex-start'
  },
  text: { 
      fontSize: 11, 
      fontWeight: '800', 
      letterSpacing: 0.5 
  }
});
