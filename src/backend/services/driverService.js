import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    addDoc,
    setDoc,
    onSnapshot
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase/config';

const driversRef = collection(db, 'drivers');

export const driverService = {

    async getByDistrict(district, machineType = null) {
        await ensureAuth();
        // Fetch all available drivers to allow flexible filtering
        const q = query(driversRef, where('availability', '==', true));
        const snap = await getDocs(q);
        let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 1. Safe District Filtering
        if (district) {
            const distNorm = (district || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const distShort = distNorm === 'coimbatore' ? 'cbe' : (distNorm === 'cbe' ? 'coimbatore' : distNorm);
            
            list = list.filter(d => {
                const dDist = (d.district || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                if (!dDist) return false;
                return dDist.includes(distNorm) || distNorm.includes(dDist) || dDist.includes(distShort) || distShort.includes(dDist);
            });
        }
        
        // 2. Filter by capability if machineType is provided, with typo tolerance
        if (machineType) {
            const m = machineType.toLowerCase().replace(/[^a-z]/g, '');
            list = list.filter(d => 
                (d.capabilities || []).some(cap => {
                    const c = cap.toLowerCase().replace(/[^a-z]/g, '');
                    if (c.includes(m) || m.includes(c)) return true;
                    // Common typo tolerance
                    if (m.includes('harvest') && (c.includes('harvest') || c.includes('hasvest') || c.includes('harvet'))) return true;
                    if (m.includes('tractor') && c.includes('trac')) return true;
                    return false;
                })
            );
        }
        return list;
    },

    /**
     * Get all drivers (for admin or fallback).
     */
    async getAll() {
        await ensureAuth();
        const snap = await getDocs(driversRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /**
     * Driver accepts a job:
     * - Writes driverId to the booking
     * - Sets driverStatus = 'accepted'
     * - Sets bookingStatus = 'driver_assigned'
     * - Sets driver availability = false
     */
    async acceptJob(bookingId, driverUid) {
        await ensureAuth();
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
            driverId: driverUid,
            driverStatus: 'accepted',
            bookingStatus: 'driver_assigned',
            driverPaymentReserved: true, // reserve payment immediately
        });
        // Mark driver as unavailable. driver documents use uid as key.
        const driverRef = doc(db, 'drivers', driverUid);
        try {
            await updateDoc(driverRef, { availability: false, currentBookingId: bookingId });
        } catch (e) {
            console.warn('driver document not found by UID, attempting lookup by userId', e);
            // fall back to querying by userId field
            const q = query(driversRef, where('userId', '==', driverUid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const realRef = snap.docs[0].ref;
                await updateDoc(realRef, { availability: false, currentBookingId: bookingId });
            } else {
                console.warn('no matching driver document for uid', driverUid);
            }
        }
    },

    /**
     * Driver rejects a job:
     * - Single target mode: Marks booking driverStatus = 'rejected'
     * - Broadcast mode: Removes driver from targetOperators to hide it from their view
     */
    async rejectJob(bookingId, driverUid) {
        await ensureAuth();
        const bookingRef = doc(db, 'bookings', bookingId);
        const bSnap = await getDoc(bookingRef);
        if (bSnap.exists()) {
            const b = bSnap.data();
            if (b.operatorMode === 'broadcast') {
                const newTargets = (b.targetOperators || []).filter(id => id !== driverUid);
                await updateDoc(bookingRef, { targetOperators: newTargets });
            } else {
                await updateDoc(bookingRef, { driverStatus: 'rejected' });
            }
        }
    },

    /**
     * Mark driver as available again (called when booking cancelled or completed).
     */
    async markAvailable(driverUid) {
        await ensureAuth();
        const driverRef = doc(db, 'drivers', driverUid);
        try {
            await updateDoc(driverRef, { availability: true, currentBookingId: null });
        } catch (e) {
            console.warn('driver document not found when marking available, trying lookup by userId', e);
            const q = query(driversRef, where('userId', '==', driverUid));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const realRef = snap.docs[0].ref;
                await updateDoc(realRef, { availability: true, currentBookingId: null });
            }
        }
    },

    /**
     * Register a new driver document (used from SignUpScreen or admin).
     */
    async register({ userId, name, phone, district, state, speciality, capabilities = [] }) {
        await ensureAuth();
        // use userId as document ID so lookups are simple later
        const driverRef = doc(driversRef, userId);
        await setDoc(driverRef, {
            userId,
            name: (name || '').trim(),
            phone: (phone || '').trim(),
            district: (district || '').trim(),
            state: (state || '').trim(),
            speciality: (speciality || '').trim(),
            capabilities, // Array of machine types
            availability: true,
            rating: 4.5, // Default rating for new drivers
            totalJobs: 0,
            currentBookingId: null,
            createdAt: new Date().toISOString()
        });
        return driverRef.id;
    },

    /**
     * Real-time subscription to a driver's assigned jobs.
     */
    subscribeDriverJobs(driverId, cb) {
        const q = query(collection(db, 'bookings'), where('driverId', '==', driverId));
        return onSnapshot(q, snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1);
            cb(list);
        });
    },
};

