import {
    collection,
    addDoc,
    getDoc,
    getDocs,
    doc,
    query,
    where,
    updateDoc,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase/config';
import { bookingService } from './bookingService';
import { driverService } from './driverService';

const gpBookingsRef = collection(db, 'groupBookings');

export const groupBookingService = {
    async createGPBooking(groupId, machine, date, totalDuration, leaderId) {
        await ensureAuth();
        
        const now = new Date();
        const minAllowed = new Date();
        minAllowed.setDate(minAllowed.getDate() + 3);
        minAllowed.setHours(0, 0, 0, 0);

        const bDate = new Date(date + 'T00:00:00');
        if (bDate < minAllowed) {
            throw new Error("Group booking date must be at least 3 days from today.");
        }
        
        const duration = Number(totalDuration);
        const MAX_GROUP_HOURS = 24;
        if (duration > MAX_GROUP_HOURS) throw new Error(`Max allowed hours is ${MAX_GROUP_HOURS}`);
        if (duration <= 0) throw new Error('Please enter valid duration');

        // Machine conflict check for individual bookings
        const isBooked = await bookingService.checkConflict({ 
            machineId: machine.id,
            startDate: date, 
            endDate: date 
        });
        if (isBooked.conflict) throw new Error('Machine already booked for this date.');

        // Check for existing GP bookings on same machine/date
        const q = query(gpBookingsRef,
            where('machineId', '==', machine.id),
            where('bookingDate', '==', date)
        );
        const existingSnap = await getDocs(q);
        const activeGP = existingSnap.docs.filter(d => d.data().status !== 'cancelled');
        if (activeGP.length > 0) {
            throw new Error('Machine already has an active group booking for this date.');
        }

        const docRef = await addDoc(gpBookingsRef, {
            groupId,
            leaderId: leaderId || null,
            machineId: machine.id,
            machineName: machine.name,
            machineImage: machine.imageUrl || machine.machineImage || '',
            machineOwnerId: machine.ownerId || '',
            machineOwnerName: machine.ownerName || '',
            ownerSnapshot: { name: machine.ownerName || '', phone: machine.ownerPhone || '' },
            leaderSnapshot: { name: machine.leaderName || 'Group Leader', phone: '' },
            bookingDate: date,
            totalDuration: duration,
            baseHourlyRate: machine.basePay || machine.rate || 0,
            status: 'gathering_requests',
            timingRequests: [],
            timeSlots: [],
            payments: [],
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    },

    async moveToScheduling(bookingId, leaderId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) throw new Error('GP Booking not found');
        const data = snap.data();
        if (data.leaderId && data.leaderId !== leaderId) {
            throw new Error('Only the group leader can move this booking to scheduling.');
        }
        if (data.status !== 'gathering_requests') {
            throw new Error('Booking is not in request-gathering stage.');
        }
        if (!data.timingRequests || data.timingRequests.length === 0) {
            throw new Error('No timing requests to schedule.');
        }
        await updateDoc(bookingRef, { status: 'scheduling' });
    },

    async requestTiming(bookingId, farmerId, requestedHours) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        if (!bookingSnap.exists()) throw new Error('GP Booking not found');

        const data = bookingSnap.data();
        
        if (data.status !== 'gathering_requests') {
            throw new Error('This booking is no longer accepting timing requests.');
        }

        const requests = data.timingRequests || [];
        
        // Calculate total hours excluding this farmer's previous request
        const otherTotal = requests
            .filter(r => r.farmerId !== farmerId)
            .reduce((sum, r) => sum + (r.requestedHours || 0), 0);

        if (otherTotal + requestedHours > data.totalDuration) {
            throw new Error(`Request exceeds available time. Only ${data.totalDuration - otherTotal} hours remaining.`);
        }

        if (requestedHours > 24) {
            throw new Error('Max allowed hours is 24\nPlease enter valid duration');
        }

        // Check if already requested — merge/update
        const existingIdx = requests.findIndex(r => r.farmerId === farmerId);
        if (existingIdx > -1) {
            requests[existingIdx] = { farmerId, requestedHours, status: 'pending' };
        } else {
            requests.push({ farmerId, requestedHours, status: 'pending' });
        }

        await updateDoc(bookingRef, { timingRequests: requests });
    },

    async finalizeSchedule(bookingId, slots, leaderId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);
        if (!bookingSnap.exists()) throw new Error('GP Booking not found');
        const data = bookingSnap.data();

        // Leader-only action
        if (data.leaderId && data.leaderId !== leaderId) {
            throw new Error('Only the group leader can finalize the schedule.');
        }

        if (data.status !== 'scheduling') {
            throw new Error('Booking must be in scheduling stage to finalize.');
        }

        // Rule 1 — Max duration
        const totalHours = slots.reduce((sum, s) => sum + s.hours, 0);
        if (totalHours > 24) throw new Error('Max allowed hours is 24');
        
        // Rule 2 — Slot sum must not exceed booking duration
        if (totalHours > data.totalDuration) {
            throw new Error(`Total slots (${totalHours}h) exceed booking duration (${data.totalDuration}h).`);
        }

        // Rule 3 — Validate working hours (06:00-20:00)
        for (const slot of slots) {
            const startH = parseInt(slot.startTime.split(':')[0], 10);
            const endH = parseInt(slot.endTime.split(':')[0], 10);
            if (startH < 6 || endH > 20) {
                throw new Error('Slots must be within working hours (06:00 - 20:00).');
            }
        }

        // Rule 4 — Sorted & Sequential, no overlaps
        const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        for (let i = 0; i < sortedSlots.length - 1; i++) {
            if (sortedSlots[i].endTime > sortedSlots[i+1].startTime) {
                throw new Error('Slots cannot overlap and must be sequential.');
            }
        }

        // Derive Start/End for machine lock
        const startTime = sortedSlots[0].startTime;
        const endTime = sortedSlots[sortedSlots.length - 1].endTime;

        // Create payments array with cost
        const payments = sortedSlots.map(s => ({
            farmerId: s.farmerId,
            hours: s.hours,
            amount: s.hours * data.baseHourlyRate,
            paid: false,
            paymentId: "",
            paymentMethod: "",
            paidAt: null,
            refunded: false
        }));

        await updateDoc(bookingRef, {
            timeSlots: sortedSlots.map(s => ({
                ...s,
                cost: s.hours * data.baseHourlyRate
            })),
            startTime,
            endTime,
            payments,
            status: 'waiting_payment'
        });
    },

    async payGPShare(bookingId, farmerId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) throw new Error('GP Booking not found');
        const data = snap.data();
        
        if (data.status !== 'waiting_payment') {
            throw new Error('Booking is not in payment stage.');
        }

        const payments = [...(data.payments || [])];
        const idx = payments.findIndex(p => p.farmerId === farmerId);
        if (idx === -1) throw new Error('Payment record not found for this user.');
        
        if (payments[idx].paid) throw new Error('You have already paid your share.');

        payments[idx].paid = true;
        payments[idx].paymentId = "SIM_" + Date.now();
        payments[idx].paymentMethod = "SIMULATED";
        payments[idx].paidAt = new Date().toISOString();
        
        const allPaid = payments.every(p => p.paid === true);

        // Sync timingRequests status to 'paid' for consistency in UI
        const requests = [...(data.timingRequests || [])];
        const rIdx = requests.findIndex(r => r.farmerId === farmerId);
        if (rIdx > -1) requests[rIdx].status = 'paid';

        // Build update payload
        const updatePayload = { payments, timingRequests: requests };
        if (allPaid) {
            // All members have paid — mark flag so UI shows it immediately via real-time listener
            updatePayload.allMembersPaid = true;
            console.log('[GroupBooking] All members paid for booking:', bookingId);
        }

        await updateDoc(bookingRef, updatePayload);
        return allPaid; // Return true if all are paid
    },

    async confirmGPBooking(bookingId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) throw new Error('GP Booking not found');
        const data = snap.data();

        if (data.status !== 'waiting_payment') throw new Error('Booking not ready for confirmation.');
        
        const allPaid = (data.payments || []).every(p => p.paid === true);
        if (!allPaid) throw new Error('All members must pay their share before confirmation.');

        // Fetch group data FIRST (fix: was used before declaration)
        const groupRef = doc(db, 'groups', data.groupId);
        const groupSnap = await getDoc(groupRef);
        const groupData = groupSnap.exists() ? groupSnap.data() : {};

        // Re-check machine availability before confirming (passing excludeId to avoid self-conflict)
        const conflict = await bookingService.checkConflict({
            machineId: data.machineId,
            startDate: data.bookingDate,
            endDate: data.bookingDate,
            excludeId: bookingId
        });
        if (conflict.conflict) {
            throw new Error('Machine has been booked by someone else. Cannot confirm.');
        }

        // Fetch driver broadcast list for the group booking
        // NOTE: We no longer lock this to a static list if it's a broadcast, 
        // allowing new drivers who register later to see the job.
        let targetOperators = [];
        // Only populate if we have a specific reason to target (e.g. manual selection)
        // For now, GP bookings are open broadcasts.
        targetOperators = [];

        // Create entry in bookings collection (Machine Lock)
        await bookingService.createBooking({
            machineId: data.machineId,
            machineName: data.machineName,
            machineImage: data.machineImage,
            ownerId: data.machineOwnerId || '',
            ownerName: data.machineOwnerName || '',
            borrowerId: data.leaderId,
            borrowerName: 'Group Booking',
            rentalStartDate: data.bookingDate,
            rentalEndDate: data.bookingDate,
            timeSlot: `${data.startTime}-${data.endTime}`,
            totalDays: 1,
            bookingType: 'group',
            groupBookingId: bookingId,
            needDriver: true,
            operatorMode: 'broadcast',
            targetOperators: targetOperators,
            deliveryLocation: groupData.location || {},
            deliveryTime: data.startTime,
            pickupTime: data.endTime,
            totalAmount: data.totalDuration * data.baseHourlyRate,
            bookingStatus: 'confirmed',
            paymentStatus: 'paid',
        });

        // Create Driver Job
        await addDoc(collection(db, 'driverJobs'), {
            bookingType: 'group',
            groupBookingId: bookingId,
            machineId: data.machineId,
            machineName: data.machineName,
            deliveryLocation: groupData.location || {},
            deliveryTime: data.startTime,
            pickupTime: data.endTime,
            status: 'available',
            createdAt: serverTimestamp()
        });

        await updateDoc(bookingRef, { status: 'confirmed' });
    },

    async getGPBooking(id) {
        await ensureAuth();
        const snap = await getDoc(doc(db, 'groupBookings', id));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    // Get all GP bookings for a specific group
    async getGPBookingsByGroup(groupId) {
        await ensureAuth();
        const q = query(gpBookingsRef, where('groupId', '==', groupId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Get GP bookings where a user has a timing request or payment
    async getGPBookingsByMember(userId) {
        await ensureAuth();
        // Firestore can't query inside array-of-objects, so fetch all and filter
        const snap = await getDocs(gpBookingsRef);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(b => {
                // User is the leader
                if (b.leaderId === userId) return true;
                // User has a timing request
                if (b.timingRequests?.some(r => r.farmerId === userId)) return true;
                // User has a payment slot
                if (b.payments?.some(p => p.farmerId === userId)) return true;
                // User has a time slot
                if (b.timeSlots?.some(s => s.farmerId === userId)) return true;
                return false;
            })
            .filter(b => b.status !== 'cancelled');
    },

    // Real-time listener for GP bookings by member
    subscribeGPBookingsByMember(userId, cb) {
        // Subscribe to all, filter client-side (Firestore limitation with nested arrays)
        return onSnapshot(gpBookingsRef, snap => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const mine = all.filter(b => {
                if (b.leaderId === userId) return true;
                if (b.timingRequests?.some(r => r.farmerId === userId)) return true;
                if (b.payments?.some(p => p.farmerId === userId)) return true;
                if (b.timeSlots?.some(s => s.farmerId === userId)) return true;
                return false;
            });
            cb(mine);
        });
    },

    // Real-time listener for a single GP booking
    subscribeGPBooking(bookingId, cb) {
        const bookingRef = doc(db, 'groupBookings', bookingId);
        return onSnapshot(bookingRef, snap => {
            if (snap.exists()) {
                cb({ id: snap.id, ...snap.data() });
            } else {
                cb(null);
            }
        });
    },

    // Get active GP bookings for a machine on a date (for availability check)
    async getActiveGPBookingsForMachine(machineId, date) {
        await ensureAuth();
        const q = query(gpBookingsRef,
            where('machineId', '==', machineId),
            where('bookingDate', '==', date)
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(b => !['cancelled', 'completed'].includes(b.status));
    },

    async completeGPBooking(bookingId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) throw new Error('GP Booking not found');
        const data = snap.data();

        if (!['confirmed', 'active'].includes(data.status)) {
            throw new Error('Booking must be confirmed or active to complete.');
        }

        // Update linked booking
        const q = query(collection(db, 'bookings'),
            where('groupBookingId', '==', bookingId));
        const bookingsSnap = await getDocs(q);
        for (const d of bookingsSnap.docs) {
            await updateDoc(d.ref, { bookingStatus: 'completed' });
        }

        // Update driver jobs
        const q2 = query(collection(db, 'driverJobs'),
            where('groupBookingId', '==', bookingId));
        const jobsSnap = await getDocs(q2);
        for (const d of jobsSnap.docs) {
            await updateDoc(d.ref, { status: 'completed' });
        }

        await updateDoc(bookingRef, { status: 'completed' });
    },

    // ── GP RENTAL LIFECYCLE ──────────────────────────────────────────────────

    /** Renter receives machine for GP: confirmed → delivered */
    async receiveGPMachine(bookingId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) throw new Error('GP Booking not found');
        const data = snap.data();

        // Check linked booking for driver acceptance
        const qb = query(collection(db, 'bookings'), where('groupBookingId', '==', bookingId));
        const driverCheckSnap = await getDocs(qb);
        for (const d of driverCheckSnap.docs) {
            const bData = d.data();
            if (bData.needDriver && bData.driverStatus !== 'accepted') {
                throw new Error('Cannot receive machine: Waiting for a driver to accept the job.');
            }
        }

        if (!['confirmed', 'dispatched'].includes(data.status)) {
            throw new Error('Machine can only be received when GP booking is confirmed or dispatched.');
        }
        // Update linked individual booking too
        const q = query(collection(db, 'bookings'), where('groupBookingId', '==', bookingId));
        const bookingsSnap = await getDocs(q);
        for (const d of bookingsSnap.docs) {
            await updateDoc(d.ref, { bookingStatus: 'delivered', receivedAt: new Date().toISOString() });
        }
        await updateDoc(bookingRef, { status: 'delivered', receivedAt: new Date().toISOString() });
    },

    /** Start GP booking work: delivered → active */
    async startGPBooking(bookingId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) throw new Error('GP Booking not found');
        const data = snap.data();
        if (data.status !== 'delivered') {
            throw new Error('Cannot start work. Machine must be received first.');
        }
        const q = query(collection(db, 'bookings'), where('groupBookingId', '==', bookingId));
        const bookingsSnap = await getDocs(q);
        for (const d of bookingsSnap.docs) {
            await updateDoc(d.ref, { bookingStatus: 'active', startedAt: new Date().toISOString() });
        }
        await updateDoc(bookingRef, { status: 'active', startedAt: new Date().toISOString() });
    },

    /** Return machine for GP: active → completed */
    async returnGPMachine(bookingId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) throw new Error('GP Booking not found');
        const data = snap.data();
        if (data.status !== 'active') {
            throw new Error('Cannot return machine. Must be in active use first.');
        }
        const q = query(collection(db, 'bookings'), where('groupBookingId', '==', bookingId));
        const bookingsSnap = await getDocs(q);
        for (const d of bookingsSnap.docs) {
            await updateDoc(d.ref, { bookingStatus: 'completed', completedAt: new Date().toISOString(), gpsStatus: 'INACTIVE' });
        }
        // Update driver jobs
        const q2 = query(collection(db, 'driverJobs'), where('groupBookingId', '==', bookingId));
        const jobsSnap = await getDocs(q2);
        for (const d of jobsSnap.docs) {
            await updateDoc(d.ref, { status: 'completed' });
        }
        await updateDoc(bookingRef, { status: 'completed', completedAt: new Date().toISOString() });
    },

    async cancelGPBooking(bookingId) {
        await ensureAuth();
        const bookingRef = doc(db, 'groupBookings', bookingId);
        const snap = await getDoc(bookingRef);
        if (!snap.exists()) throw new Error('GP Booking not found');
        const data = snap.data();

        // Process refunds for paid users
        const payments = [...(data.payments || [])];
        let totalRefunded = 0;
        for (let i = 0; i < payments.length; i++) {
            if (payments[i].paid) {
                payments[i].refunded = true;
                totalRefunded += payments[i].amount;
            }
        }

        // If confirmed, cancel linked docs
        if (data.status === 'confirmed' || data.status === 'active') {
            // Cancel booking placeholder
            const q = query(collection(db, 'bookings'), 
                      where('groupBookingId', '==', bookingId));
            const bookingsSnap = await getDocs(q);
            for (const d of bookingsSnap.docs) {
                await updateDoc(d.ref, { bookingStatus: 'cancelled' });
            }

            // Cancel driver jobs
            const q2 = query(collection(db, 'driverJobs'), 
                       where('groupBookingId', '==', bookingId));
            const jobsSnap = await getDocs(q2);
            for (const d of jobsSnap.docs) {
                await updateDoc(d.ref, { status: 'cancelled' });
            }
        }

        await updateDoc(bookingRef, { 
            status: 'cancelled',
            payments,
            totalRefunded,
            cancelledAt: new Date().toISOString()
        });
    }
};

