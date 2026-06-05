import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, FontSize, BorderRadius, Glass, Shadows } from '../theme/Theme';
import { RealFirestore, db } from '../../backend/services/RealFirebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function AdminUsersScreen({ navigation }) {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [actionLoading, setActionLoading] = React.useState(null);
    const [filterRole, setFilterRole] = React.useState('all');

    React.useEffect(() => {
        const usersRef = collection(db, 'users');
        const unsub = onSnapshot(usersRef, (snapshot) => {
            setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Users subscription error:", err);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const toggleStatus = async (user) => {
        setActionLoading(user.id);
        try {
            await RealFirestore.updateUserStatus(user.id, !user.isActive);
            Alert.alert('Success', `User ${user.isActive ? 'deactivated' : 'activated'}`);
        } catch (e) {
            Alert.alert('Error', 'Error updating user: ' + e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const deleteUser = async (user) => {
        Alert.alert('Delete User', 'Are you sure? This action cannot be undone.', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setActionLoading(user.id);
                    try {
                        await RealFirestore.deleteUser(user.id);
                        Alert.alert('Success', 'User deleted');
                    } catch (e) {
                        Alert.alert('Error', 'Error deleting user: ' + e.message);
                    } finally {
                        setActionLoading(null);
                    }
                }
            }
        ]);
    };

    const filteredUsers = filterRole === 'all' 
        ? users 
        : users.filter(u => u.role === filterRole);

    const renderItem = ({ item }) => {
        const roleColors = {
            farmer: Colors.agriGreen,
            driver: Colors.agriEarth,
            admin: Colors.navy,
            owner: Colors.agriGreenLight
        };
        const roleColor = roleColors[item.role?.toLowerCase()] || Colors.textSecondary;

        return (
            <TouchableOpacity style={styles.userCard} onPress={() => navigation.navigate('AdminUserDetails', { userId: item.id })}>
                <View style={styles.avatarBox}>
                    <Ionicons name="person" size={20} color={roleColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.userName}>{item.name || item.phoneNumber || 'Unnamed User'}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
                        <Text style={[styles.roleBadgeText, { color: roleColor }]}> {(item.role === 'driver' ? 'OPERATOR' : (item.role?.toUpperCase() || 'NO ROLE'))}</Text>
                    </View>
                    {item.createdAt && <Text style={styles.createdAt}>Member since {new Date(item.createdAt).toLocaleDateString()}</Text>}
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: item.isActive ? '#FEF2F2' : '#F0FDF4' }]}
                        onPress={() => toggleStatus(item)}
                        disabled={actionLoading === item.id}
                    >
                        {actionLoading === item.id ? (
                            <ActivityIndicator size="small" color={item.isActive ? Colors.error : Colors.success} />
                        ) : (
                            <Ionicons 
                                name={item.isActive ? "lock-closed-outline" : "lock-open-outline"} 
                                size={18} 
                                color={item.isActive ? Colors.error : Colors.success} 
                            />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteUser(item)}
                        disabled={actionLoading === item.id}
                    >
                        <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper noBackground>
            <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
                <Text style={styles.title}>User Management</Text>
                
                {/* Filter Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingRight: 20 }}>
                    {['all', 'farmer', 'driver', 'owner', 'admin'].map(role => {
                        const roleLabel = role === 'driver' ? 'OPERATOR' : role.toUpperCase();
                        return (
                            <TouchableOpacity
                                key={role}
                                style={[styles.filterBtn, filterRole === role && styles.filterBtnActive]}
                                onPress={() => setFilterRole(role)}
                            >
                                <Text style={[styles.filterText, filterRole === role && styles.filterTextActive]}>
                                    {roleLabel}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {loading ? (
                    <ActivityIndicator color={Colors.navy} />
                ) : filteredUsers.length === 0 ? (
                    <Text style={styles.emptyText}>No users found</Text>
                ) : (
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    />
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: Spacing.m, backgroundColor: '#F8FAFC' },
    title: { fontSize: 24, fontWeight: '900', color: Colors.agriGreen, marginBottom: Spacing.l },
    filterRow: { marginBottom: Spacing.m, flexDirection: 'row' },
    filterBtn: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
    filterBtnActive: { backgroundColor: Colors.agriGreen, borderColor: Colors.agriGreen },
    filterText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800' },
    filterTextActive: { color: '#FFF' },
    userCard: {
        backgroundColor: '#FFF',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderRadius: BorderRadius.m,
        ...Shadows.soft,
    },
    avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    userName: { fontSize: 16, fontWeight: '700', color: Colors.navy },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    roleBadgeText: { fontSize: 9, fontWeight: '900' },
    createdAt: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 15, fontWeight: '600' }
});

