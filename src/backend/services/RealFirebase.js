import { signInAnonymously } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    deleteDoc
} from 'firebase/firestore';
import { auth, db, storage } from '../firebase/config';

export { auth, db, storage };

export const RealAuth = {
    // "Soft" Login: Check if user exists in 'users' col by phone, else create.
    loginWithPhone: async (phoneNumber) => {
        // Sign in anonymously first to satisfy Firestore security rules
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            // Create new user with Firebase UID as Doc ID
            const uid = auth.currentUser.uid;
            const initialState = {
                phoneNumber,
                role: (phoneNumber === '9999999999' || phoneNumber === '+919999999999') ? 'admin' : null,
                isActive: true,
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'users', uid), initialState);
            return { uid, ...initialState };
        } else {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();

            if (userData.isActive === false) {
                throw new Error('This account has been deactivated by the admin.');
            }

            // Ensure admin role for test number
            if ((phoneNumber === '9999999999' || phoneNumber === '+919999999999') && userData.role !== 'admin') {
                const userRef = doc(db, 'users', userDoc.id);
                await updateDoc(userRef, { role: 'admin' });
                return { uid: userDoc.id, ...userData, role: 'admin' };
            }

            return { uid: userDoc.id, ...userData };
        }
    },

    updateRole: async (uid, role, extraUpdates = {}) => {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, { role, ...extraUpdates }, { merge: true });
        return { uid, role, ...extraUpdates };
    }
};

export const RealFirestore = {
    getMachines: async () => {
        // Phase 1: Only return approved machines
        const machinesRef = collection(db, 'machines');
        const q = query(machinesRef, where('status', '==', 'approved'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    getMachineById: async (id) => {
        try {
            const docRef = doc(db, 'machines', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (e) {
            console.error("Error fetching machine:", e);
            return null;
        }
    },

    addMachine: async (machine, ownerId) => {
        // Phase 1: New machines start as 'pending'
        await addDoc(collection(db, 'machines'), {
            ...machine,
            ownerId,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    },

    getAllUsers: async () => {
        const snapshot = await getDocs(collection(db, 'users'));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    updateUserStatus: async (uid, isActive) => {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { isActive });
    },

    deleteUser: async (uid) => {
        try {
            await deleteDoc(doc(db, 'users', uid));
        } catch (e) {
            console.error("Error deleting user:", e);
            throw e;
        }
    },

    getAllMachinesAdmin: async () => {
        const snapshot = await getDocs(collection(db, 'machines'));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    getMachinesByStatus: async (status) => {
        const machinesRef = collection(db, 'machines');
        const q = query(machinesRef, where('status', '==', status));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    getMachinesByOwner: async (ownerId) => {
        const machinesRef = collection(db, 'machines');
        const q = query(machinesRef, where('ownerId', '==', ownerId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    updateMachineStatus: async (machineId, status) => {
        const machineRef = doc(db, 'machines', machineId);
        await updateDoc(machineRef, { status });
    },

    // general update for machine fields
    updateMachine: async (machineId, updates) => {
        const machineRef = doc(db, 'machines', machineId);
        await updateDoc(machineRef, updates);
    },

    deleteMachine: async (machineId) => {
        try {
            await deleteDoc(doc(db, 'machines', machineId));
        } catch (e) {
            console.error("Error deleting machine:", e);
            throw e;
        }
    },

    getBookings: async () => {
        const snapshot = await getDocs(collection(db, 'bookings'));
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    createBooking: async (bookingData) => {
        // Phase 1: Real booking structure with payment breakdown
        const docRef = await addDoc(collection(db, 'bookings'), {
            ...bookingData,
            status: 'pending',
            paymentStatus: 'unpaid',
            // for cancellation
            refundPercent: 0,
            refundAmount: 0,
            driverCompensation: 0,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    },

    updateBookingStatus: async (bookingId, status, paymentStatus = 'unpaid') => {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, { status, paymentStatus });
    },

    uploadVideo: async (uri) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileName = `handshakes/${Date.now()}.mp4`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
        } catch (e) {
            console.error("Storage upload failed", e);
            throw e;
        }
    },

    getFarmerBookings: async (farmerId) => {
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('farmerId', '==', farmerId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    getDriverSchedule: async (driverId) => {
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('driverId', '==', driverId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    acceptJob: async (bookingId, driverId) => {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, { driverId, status: 'confirmed' });
    },

    getAvailableJobs: async () => {
        // Return bookings with status='pending' (awaiting driver)
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    getBookingsByStatus: async (status) => {
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('status', '==', status));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    getPaidBookings: async () => {
        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, where('paymentStatus', '==', 'paid'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    cancelBooking: async (bookingId) => {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, { status: 'cancelled' });
    },

    updateVideoUrls: async (bookingId, farmerUrl, driverUrl) => {
        const bookingRef = doc(db, 'bookings', bookingId);
        const updateData = {};
        if (farmerUrl) updateData.videoFarmerUrl = farmerUrl;
        if (driverUrl) updateData.videoDriverUrl = driverUrl;
        if (Object.keys(updateData).length > 0) {
            await updateDoc(bookingRef, updateData);
        }
    }
};

