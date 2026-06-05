import {
    collection,
    addDoc,
    getDoc,
    getDocs,
    doc,
    query,
    where,
    updateDoc,
    arrayUnion
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase/config';

const groupsRef = collection(db, 'groups');

// Haversine formula to calculate distance in KM
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export const groupService = {
    async createGroup(name, leaderId, location, radiusLimit = 10) {
        await ensureAuth();

        // Duplicate name check
        const q = query(groupsRef, where('name', '==', name.trim()));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error(`A group named "${name}" already exists. Please choose a different name.`);
        }

        if (!name.trim()) throw new Error('Group name cannot be empty.');
        if (radiusLimit <= 0) throw new Error('Radius must be greater than 0.');

        const docRef = await addDoc(groupsRef, {
            name: name.trim(),
            leaderId,
            location,
            radiusLimit,
            maxMembers: 20,
            status: 'open',
            members: [leaderId],
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    },

    async joinGroup(groupId, userId, userLocation) {
        await ensureAuth();
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        
        if (!groupSnap.exists()) throw new Error('Group not found');
        
        const groupData = groupSnap.data();

        // Check if group is closed
        if (groupData.status === 'closed') {
            throw new Error('This group is closed and not accepting new members.');
        }

        // Check if group is full
        const maxMembers = groupData.maxMembers || 20;
        if (groupData.members && groupData.members.length >= maxMembers) {
            throw new Error('This group is full.');
        }
        
        // Radius validation
        if (userLocation && userLocation.lat && userLocation.lng &&
            groupData.location && groupData.location.lat && groupData.location.lng) {
            const dist = haversine(
                userLocation.lat, userLocation.lng,
                groupData.location.lat, groupData.location.lng
            );
            
            if (dist > groupData.radiusLimit) {
                throw new Error(`Location outside group radius. Distance: ${dist.toFixed(1)}km, Limit: ${groupData.radiusLimit}km`);
            }
        }

        if (groupData.members && groupData.members.includes(userId)) return;

        await updateDoc(groupRef, {
            members: arrayUnion(userId)
        });
    },

    async getGroup(groupId) {
        await ensureAuth();
        const groupRef = doc(db, 'groups', groupId);
        const snap = await getDoc(groupRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    async getGroupsByUser(userId) {
        await ensureAuth();
        const q1 = query(groupsRef, where('members', 'array-contains', userId));
        const snap1 = await getDocs(q1);
        const groups = snap1.docs.map(d => ({ id: d.id, ...d.data() }));

        const q2 = query(groupsRef, where('leaderId', '==', userId));
        const snap2 = await getDocs(q2);
        
        snap2.docs.forEach(d => {
            if (!groups.find(g => g.id === d.id)) {
                groups.push({ id: d.id, ...d.data() });
            }
        });
        return groups;
    },

    async getAllGroups() {
        await ensureAuth();
        const snap = await getDocs(groupsRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Distance-based discovery with Haversine filtering
    async discoverGroups(userId, userLocation = null) {
        await ensureAuth();
        const snap = await getDocs(groupsRef);
        let groups = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(g => !g.members || !g.members.includes(userId))
            .filter(g => g.status !== 'closed');

        // If user location is provided, calculate distance and filter by radius
        if (userLocation && userLocation.lat && userLocation.lng) {
            groups = groups.map(g => {
                const gLat = g.location?.lat;
                const gLng = g.location?.lng;
                const distance = (gLat != null && gLng != null)
                    ? haversine(userLocation.lat, userLocation.lng, gLat, gLng)
                    : 99999;
                return { ...g, _distKm: distance };
            })
            .filter(g => g._distKm <= (g.radiusLimit || 10))
            .sort((a, b) => a._distKm - b._distKm);
        }

        // Filter out full groups
        groups = groups.filter(g => {
            const maxMembers = g.maxMembers || 20;
            return !g.members || g.members.length < maxMembers;
        });

        return groups;
    },

    async leaveGroup(groupId, userId) {
        await ensureAuth();
        const groupRef = doc(db, 'groups', groupId);
        const snap = await getDoc(groupRef);
        if (!snap.exists()) throw new Error('Group not found');
        
        const data = snap.data();
        
        // Leader cannot leave
        if (data.leaderId === userId) {
            throw new Error('Group leader cannot leave the group. Transfer leadership first or delete the group.');
        }
        
        const members = data.members || [];
        const newMembers = members.filter(m => m !== userId);
        await updateDoc(groupRef, { members: newMembers });
    },

    // Haversine exported for reuse
    haversine
};

