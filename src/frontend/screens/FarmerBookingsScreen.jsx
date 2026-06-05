import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../../backend/services/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius, Shadows, Glass } from '../theme/Theme';
import MachineCard from '../components/MachineCard';
import { machineService } from '../../backend/services/machineService';

export default function FarmerBookingsScreen({ navigation }) {
    const { user } = useAuth();
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe = null;
        if (user?.uid) {
            unsubscribe = machineService.subscribeByOwner(user.uid, list => {
                setMachines(list);
                setLoading(false);
            });
        }
        return () => unsubscribe && unsubscribe();
    }, [user]);

    const renderItem = ({ item }) => {
        const toggle = async () => {
            await machineService.toggleAvailability(item.id, !item.isAvailable);
        };
        return (
            <View style={{ marginBottom: Spacing.m }}>
                <MachineCard machine={item} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.s }}>
                    <TouchableOpacity onPress={() => navigation.navigate('AddMachine', { machineId: item.id })} style={styles.editBtn}>
                        <Text style={styles.editBtnText}>✎ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggle} style={styles.availBtn}>
                        <Text style={styles.availBtnText}>
                            {item.isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ScreenWrapper noPadding>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Listings</Text>
            </View>
            {loading ? (
                <ActivityIndicator color={Colors.forestGreen} size="large" style={{ marginTop: Spacing.xl }} />
            ) : machines.length === 0 ? (
                <View style={{ padding: Spacing.l, alignItems: 'center' }}>
                    <Text>No listings yet</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddMachine')}>
                        <Text style={styles.addBtnText}>Add Machine</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={machines}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: Spacing.m }}
                />
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: Colors.forestGreen,
        paddingHorizontal: Spacing.m,
        paddingTop: Platform.OS === 'ios' ? 48 : 24,
        paddingBottom: 20,
        borderBottomLeftRadius: BorderRadius.l,
        borderBottomRightRadius: BorderRadius.l,
        ...Shadows.strong,
    },
    headerTitle: {
        color: Colors.cream,
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
    },
    addBtn: {
        marginTop: 20,
        backgroundColor: Colors.forestGreen,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: BorderRadius.m,
        ...Shadows.medium,
    },
    addBtnText: {
        color: Colors.cream,
        fontWeight: '800',
        fontSize: 14,
    },
    availBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(26, 77, 58, 0.1)',
        alignItems: 'center',
        marginLeft: 8,
    },
    editBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: Colors.gold,
        alignItems: 'center',
        marginRight: 8,
    },
    editBtnText: { color: Colors.forestGreen, fontWeight: '800', fontSize: 13 },
    availBtnText: { color: Colors.forestGreen, fontSize: 13, fontWeight: '800' }
});

