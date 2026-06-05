import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  and,
  arrayUnion
} from 'firebase/firestore';

// Valid rental lifecycle transitions
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['dispatched', 'delivered', 'cancelled'],
  dispatched: ['delivered', 'cancelled'],
  delivered: ['active', 'cancelled'],
  active: ['completed'],
  completed: [],
  cancelled: [],
  in_use: ['completed'],
  driver_assigned: ['dispatched', 'delivered', 'in_use', 'cancelled'],
};
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, ensureAuth } from '../firebase/config';

const bookingsRef = collection(db, 'bookings');

// ─── Helpers ────────────────────────────────────────────────────────────────

// Parse a YYYY-MM-DD string into a Date at midnight
const parseDate = (str) => {
  if (!str || typeof str !== 'string') return null;
  // Strict check for YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// Parse hour strings like "08:00", "10AM", "2PM" into numbers
const parseHour = (timeStr) => {
  if (!timeStr) return 0;
  timeStr = timeStr.toString().toUpperCase().replace(/\s/g, '');
  if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':');
    return parseInt(h, 10) + (parseInt(m, 10) / 60);
  }
  let h = parseInt(timeStr.replace(/[^0-9]/g, ''), 10);
  if (timeStr.includes('PM') && h !== 12) h += 12;
  if (timeStr.includes('AM') && h === 12) h = 0;
  return h;
};

// Check if two time slots overlap strictly. Range 1: [reqS, reqE], Range 2: [bS, bE]
const timeOverlap = (slot1, slot2) => {
  if (!slot1 || !slot2) return false;
  // Split on any dash variant: –  —  or plain -
  const splitSlot = (s) => s.split(/[–—-]/);
  const [s1, e1] = splitSlot(slot1);
  const [s2, e2] = splitSlot(slot2);
  if (!s1 || !e1 || !s2 || !e2) return false;

  const start1 = parseHour(s1.trim());
  const end1 = parseHour(e1.trim());
  const start2 = parseHour(s2.trim());
  const end2 = parseHour(e2.trim());

  // Overlap condition: start1 < end2 && end1 > start2
  return start1 < end2 && end1 > start2;
};

// Return true if two date ranges overlap
// Range 1: [s1, e1]  Range 2: [s2, e2]
const rangesOverlap = (s1, e1, s2, e2) => s1 <= e2 && s2 <= e1;

// ─── bookingService ──────────────────────────────────────────────────────────

export const bookingService = {

  // ── VALIDATION ──────────────────────────────────────────────────────────

  /**
   * Validates booking inputs on the client side.
   * Returns { ok: true } or { ok: false, reason: "..." }
   */
  validateInputs({ startDate, endDate, timeSlot, rentalHours }) {
    if (!startDate || !endDate) return { ok: false, reason: "Start and end dates are required" };
    if (!timeSlot) return { ok: false, reason: 'Please select a time slot.' };

    const reqStart = parseDate(startDate);
    const reqEnd = parseDate(endDate || startDate);

    if (!reqStart || !reqEnd) {
      return { ok: false, reason: "Invalid date format. Use YYYY-MM-DD." };
    }

    reqStart.setHours(0, 0, 0, 0);
    reqEnd.setHours(0, 0, 0, 0);

    const now = new Date();
    const minAllowedDate = new Date(now);
    minAllowedDate.setDate(now.getDate() + 3);
    minAllowedDate.setHours(0, 0, 0, 0);

    if (reqStart < minAllowedDate) {
      return { ok: false, reason: "Bookings must be made at least 3 days in advance." };
    }

    if (reqEnd < reqStart) {
      return { ok: false, reason: "End date must be greater than or equal to start date." };
    }

    // duration cap
    const hours = Number(rentalHours) || 0;
    const MAX_HOURS = 24;
    if (hours > MAX_HOURS) {
      return { ok: false, reason: `Max allowed hours is ${MAX_HOURS}\nPlease enter valid duration` };
    }

    return { ok: true };
  },

  /**
   * Checks Firestore for any booking that overlaps the requested period
   * for the same machine (excluding cancelled bookings).
   * Returns { conflict: false } or { conflict: true, booking: {...} }
   */
  async checkConflict({ machineId, startDate, endDate, timeSlot, excludeId }) {
    await ensureAuth();
    // Fetch all bookings for this machine (filter cancelled client-side to avoid composite index)
    const q = query(
      bookingsRef,
      where('machineId', '==', machineId)
    );
    const snap = await getDocs(q);

    const reqStart = parseDate(startDate);
    const reqEnd = parseDate(endDate);

    for (const d of snap.docs) {
      const b = d.data();
      // Skip current booking if it's the one we're excluding
      if (d.id === excludeId) continue;
      // Skip cancelled/completed bookings
      if (b.bookingStatus === 'cancelled' || b.bookingStatus === 'completed') continue;
      const bStart = parseDate(b.rentalStartDate);
      const bEnd = parseDate(b.rentalEndDate);
      if (!bStart || !bEnd) continue;

      if (rangesOverlap(reqStart, reqEnd, bStart, bEnd)) {
        if (!timeSlot || !b.timeSlot) {
          return { conflict: true, booking: { id: d.id, ...b } };
        }
        if (timeOverlap(timeSlot, b.timeSlot)) {
          return { conflict: true, booking: { id: d.id, ...b } };
        }
      }
    }

    // Also check GP bookings for same machine/date
    try {
      const gpRef = collection(db, 'groupBookings');
      const gpQ = query(gpRef, where('machineId', '==', machineId));
      const gpSnap = await getDocs(gpQ);
      for (const d of gpSnap.docs) {
        const gp = d.data();
        if (d.id === excludeId) continue;
        if (['cancelled', 'completed'].includes(gp.status)) continue;
        const gpDate = parseDate(gp.bookingDate);
        if (!gpDate) continue;
        if (rangesOverlap(reqStart, reqEnd, gpDate, gpDate)) {
          return { conflict: true, booking: { id: d.id, ...gp, _type: 'group' } };
        }
      }
    } catch (e) {
      console.warn('GP conflict check failed (non-fatal):', e);
    }

    return { conflict: false };
  },

  // ── CRUD ────────────────────────────────────────────────────────────────

  /**
   * Creates a booking document with complete fields.
   * Callers must validate + check conflict BEFORE calling this.
   */
  async createBooking(data) {
    await ensureAuth();
    // run server-side conflict check too
    const conflict = await this.checkConflict({
      machineId: data.machineId,
      startDate: data.rentalStartDate,
      endDate: data.rentalEndDate,
      timeSlot: data.timeSlot,
      excludeId: data.excludeId || data.groupBookingId, // Ignore self-group during confirmation
    });
    if (conflict.conflict) {
      throw new Error('Machine already booked for the requested slot');
    }

    // breakdown amounts
    const machineAmount = data.machineAmount != null ? data.machineAmount : (data.totalAmount || 0) - (data.driverAmount || 0) - (data.platformFee || 0);
    const driverAmount = data.driverAmount || 0;
    const platformFee = data.platformFee || 0;
    const totalAmount = machineAmount + driverAmount + platformFee;

    const payload = {
      machineId: data.machineId,
      machineName: data.machineName,
      machineImage: data.machineImage || '',
      ownerId: data.ownerId,
      ownerName: data.ownerName || '',
      ownerSnapshot: { name: data.ownerName || '', phone: data.ownerPhone || '' },
      borrowerId: data.borrowerId,
      borrowerName: data.borrowerName || '',
      borrowerSnapshot: { name: data.borrowerName || '', phone: data.borrowerPhone || '' },
      rentalStartDate: data.rentalStartDate,
      rentalEndDate: data.rentalEndDate,
      timeSlot: data.timeSlot || '',
      totalDays: data.totalDays || 1,
      machineAmount,
      driverAmount,
      platformFee,
      totalAmount,
      needDriver: data.needDriver || false,
      operatorMode: data.operatorMode || null,
      targetOperators: data.targetOperators || [],
      driverId: data.driverId || null,
      driverStatus: data.needDriver ? 'pending_driver_accept' : null,
      bookingType: data.bookingType || 'individual',
      groupBookingId: data.groupBookingId || null,
      bookingStatus: data.bookingStatus || 'pending',
      paymentStatus: data.paymentStatus || 'pending',
      transactionId: data.transactionId || null,
      handoverMediaUrl: null,
      returnMediaUrl: null,
      rated: false,
      createdAt: new Date().toISOString(),
      boundary: data.boundary || null,
      gpsStatus: 'INACTIVE',
      lastLocation: { lat: 0, lng: 0 },
      gpsLastUpdate: null,
    };
    const docRef = await addDoc(bookingsRef, payload);
    return docRef.id;
  },

  /** Update any fields on a booking document */
  async updateBooking(id, updates) {
    await ensureAuth();
    const bookingRef = doc(db, 'bookings', id);
    await updateDoc(bookingRef, updates);
  },

  /** 
   * Uploads a file to Firebase Storage and adds the URL to the booking's media array.
   * type: 'handover' | 'return'
   */
  async uploadBookingMedia(bookingId, fileUri, type) {
    await ensureAuth();

    // 1. Fetch the file blob (works in React Native/Expo)
    const response = await fetch(fileUri);
    const blob = await response.blob();

    // 2. Create storage ref
    const filename = `${type}_${Date.now()}.jpg`;
    const storagePath = `bookings/${bookingId}/${type}/${filename}`;
    const fileRef = ref(storage, storagePath);

    // 3. Upload
    await uploadBytes(fileRef, blob);

    // 4. Get URL
    const downloadURL = await getDownloadURL(fileRef);

    // 5. Update Firestore (add to array)
    const field = type === 'handover' ? 'handoverPhotos' : 'returnPhotos';
    await this.updateBooking(bookingId, {
      [field]: arrayUnion(downloadURL)
    });

    return downloadURL;
  },

  /** Convenience: update just the status. Logs errors for debugging network issues. */
  async updateStatus(id, bookingStatus) {
    try {
      return await this.updateBooking(id, { bookingStatus });
    } catch (e) {
      console.error('bookingService.updateStatus failed', { id, bookingStatus, error: e });
      throw e;
    }
  },

  // ── RENTAL LIFECYCLE ────────────────────────────────────────────────────

  /** Owner dispatches the machine to renter: confirmed/driver_assigned → dispatched */
  async dispatchMachine(bookingId) {
    await ensureAuth();
    const b = await this.getById(bookingId);
    if (!b) throw new Error('Booking not found');

    if (b.needDriver && b.driverStatus !== 'accepted') {
      throw new Error('Driver must accept the job before you can dispatch the machine.');
    }
    if (!['confirmed', 'driver_assigned'].includes(b.bookingStatus)) {
      throw new Error('Machine can only be dispatched from confirmed or driver_assigned status.');
    }
    await this.updateBooking(bookingId, {
      bookingStatus: 'dispatched',
      dispatchedAt: new Date().toISOString(),
      gpsStatus: 'SAFE',
    });
    console.log("[GPS] Updated status to dispatched for booking:", bookingId);
  },

  /** Renter receives the machine: dispatched → delivered */
  async receiveMachine(bookingId) {
    await ensureAuth();
    const b = await this.getById(bookingId);
    if (!b) throw new Error('Booking not found');

    if (b.needDriver && b.driverStatus !== 'accepted') {
      throw new Error('Cannot proceed: Waiting for a driver to accept the job.');
    }

    if (!['confirmed', 'dispatched', 'driver_assigned'].includes(b.bookingStatus)) {
      throw new Error('Machine can only be received after it has been dispatched.');
    }
    await this.updateBooking(bookingId, {
      bookingStatus: 'delivered',
      receivedAt: new Date().toISOString(),
    });
  },

  /** Renter starts work: delivered → active */
  async startWork(bookingId) {
    await ensureAuth();
    const b = await this.getById(bookingId);
    if (!b) throw new Error('Booking not found');
    if (b.bookingStatus !== 'delivered') {
      throw new Error('Cannot start work. Machine must be received first (status: delivered).');
    }
    await this.updateBooking(bookingId, {
      bookingStatus: 'active',
      startedAt: new Date().toISOString(),
    });
  },

  /** Renter returns machine: active → completed */
  async returnMachine(bookingId) {
    await ensureAuth();
    const b = await this.getById(bookingId);
    if (!b) throw new Error('Booking not found');
    if (b.bookingStatus !== 'active' && b.bookingStatus !== 'in_use') {
      throw new Error('Cannot return machine. Must be in active use first.');
    }
    await this.updateBooking(bookingId, {
      bookingStatus: 'completed',
      completedAt: new Date().toISOString(),
      gpsStatus: 'INACTIVE',
    });
  },

  /** calculate refund percent based on cancellation time */
  calculateRefund(booking) {
    const start = parseDate(booking.rentalStartDate);
    const now = new Date();
    const hrs = (start - now) / 3600000;
    if (hrs > 24) return 1;
    if (hrs > 6) return 0.5;
    return 0;
  },

  /** cancel a booking with refund and driver compensation logic */
  async cancelBooking(bookingId) {
    await ensureAuth();
    const b = await this.getById(bookingId);
    if (!b) throw new Error('Booking not found');
    if (b.bookingStatus === 'completed') throw new Error('Cannot cancel a completed booking.');
    const refundPercent = this.calculateRefund(b);
    const refundAmount = (b.totalAmount || 0) * refundPercent;
    const updates = {
      bookingStatus: 'cancelled',
      refundPercent,
      refundAmount,
      gpsStatus: 'INACTIVE',
    };
    if (b.driverId && b.driverStatus === 'accepted') {
      updates.driverCompensation = 200; // fixed compensation
    }
    await this.updateBooking(bookingId, updates);
    return { refundPercent, refundAmount, driverCompensation: updates.driverCompensation || 0 };
  },

  async getById(id) {
    await ensureAuth();
    const snap = await getDoc(doc(db, 'bookings', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  // ── REAL-TIME SUBSCRIPTIONS ─────────────────────────────────────────────

  /** Farmer (borrower) – their bookings as renter */
  subscribeByBorrower(borrowerId, cb) {
    const q = query(bookingsRef, where('borrowerId', '==', borrowerId));
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1);
      cb(list);
    });
  },

  /** Machine owner – bookings for their machines */
  subscribeByOwner(ownerId, cb) {
    const q = query(bookingsRef, where('ownerId', '==', ownerId));
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1);
      cb(list);
    });
  },

  /** Driver – bookings assigned to them */
  subscribeByDriver(driverId, cb) {
    const q = query(bookingsRef, where('driverId', '==', driverId));
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1);
      cb(list);
    });
  },

  /** Driver portal – pending jobs targeted to the driver */
  subscribeAvailableJobs(driverId, cb) {
    if (!driverId) return () => {};
    const q = query(
      bookingsRef,
      where('needDriver', '==', true)
    );
    return onSnapshot(q, snap => {
      console.log(`[DriverJobs] Query returned ${snap.docs.length} jobs with needDriver:true`);
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => {
            const isTargeted = b.targetOperators && b.targetOperators.length > 0;
            const included = !isTargeted || (b.targetOperators || []).includes(driverId);
            const statusMatch = b.bookingStatus === 'confirmed' || b.bookingStatus === 'pending';
            const unassigned = b.driverId === null;
            
            if (!(statusMatch && unassigned && included)) {
                // If it's a broadcast job but driver wasn't in the initial static list (legacy), allow it
                if (unassigned && statusMatch && b.operatorMode === 'broadcast') {
                    console.log(`[DriverJobs] ✨ Dynamically allowing broadcast job ${b.id} for driver ${driverId}`);
                    return true;
                }
                
                console.log(`[DriverJobs] ❌ Mapping check failed for job ${b.id}:`, {
                    status: b.bookingStatus,
                    driverId: b.driverId,
                    isTargeted,
                    driverIncluded: included,
                    type: b.bookingType,
                    mode: b.operatorMode
                });
            } else {
                console.log(`[DriverJobs] ✅ Job ${b.id} (${b.machineName}) is visible to driver ${driverId}`);
            }
            
            return unassigned && statusMatch && included;
        });
      list.sort((a, b) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1);
      cb(list);
    });
  },

  /** Admin – all bookings */
  subscribeAll(cb) {
    return onSnapshot(query(bookingsRef), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt || 0) > (a.createdAt || 0) ? 1 : -1);
      cb(list);
    });
  },
};

