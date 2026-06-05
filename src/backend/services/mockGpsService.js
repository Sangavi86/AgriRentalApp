import { bookingService } from './bookingService';
import { machineService } from './machineService';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

// Haversine formula to calculate distance in Km
function getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

class MockGpsService {
    constructor() {
        this.timers = {};
        this.lastUpdate = {};
        this.borrowerSub = null;
        this.ownerSub = null;
        this.trackedBookings = new Map(); // Store merged bookings
        this.rescueTimer = null;
    }

    generateMockLocation(centerLat, centerLng, radiusKm) {
        // Generate a random location up to radius + 3 km to test OUT_OF_RANGE and ALERT.
        const distance = Math.random() * (radiusKm + 3);
        const angle = Math.random() * 2 * Math.PI;

        const dLat = (distance * Math.cos(angle)) / 111;
        const dLng = (distance * Math.sin(angle)) / (111 * Math.cos(centerLat * (Math.PI / 180)));

        return {
            lat: centerLat + dLat,
            lng: centerLng + dLng
        };
    }

    initForUser(userId) {
        if (!userId) return;
        this.stopAll();

        const updateMerged = () => {
            this.handleBookingsUpdate(Array.from(this.trackedBookings.values()));
        };

        this.borrowerSub = bookingService.subscribeByBorrower(userId, (bookings) => {
            bookings.forEach(b => this.trackedBookings.set(b.id, b));
            updateMerged();
        });

        this.ownerSub = bookingService.subscribeByOwner(userId, (bookings) => {
            bookings.forEach(b => this.trackedBookings.set(b.id, b));
            updateMerged();
        });

        // Add Driver subscription so drivers also drive the GPS updates
        this.driverSub = bookingService.subscribeByDriver(userId, (bookings) => {
            bookings.forEach(b => this.trackedBookings.set(b.id, b));
            updateMerged();
        });

        // Add a global "Rescue Loop" that runs even if subscriptions miss something
        if (this.rescueTimer) clearInterval(this.rescueTimer);
        this.rescueTimer = setInterval(() => {
            console.log("[GPS] Global Rescue Loop triggering...");
            updateMerged();
        }, 10000); // Check every 10 seconds
    }

    stopAll() {
        if (this.borrowerSub) { this.borrowerSub(); this.borrowerSub = null; }
        if (this.ownerSub) { this.ownerSub(); this.ownerSub = null; }
        if (this.driverSub) { this.driverSub(); this.driverSub = null; }
        if (this.rescueTimer) { clearInterval(this.rescueTimer); this.rescueTimer = null; }
        this.trackedBookings.clear();

        for (const bookingId in this.timers) {
            this.stopLoop(bookingId, 'INACTIVE');
        }
    }

    startTracking(bookings) {
        bookings.forEach(b => {
            const status = (b.bookingStatus || b.status || '').toLowerCase();
            if (['dispatched', 'active', 'delivered', 'in_use'].includes(status)) {
                if (!this.timers[b.id]) {
                    console.log("[GPS] 🛰️ STARTING TRACKING for:", b.id, "Status:", status);
                    this.startLoop(b);
                }
            }
        });
    }

    handleBookingsUpdate(bookings) {
        this.startTracking(bookings);
    }

    async startLoop(booking) {
        if (this.timers[booking.id]) return;

        let isRunning = true;
        this.lastUpdate[booking.id] = Date.now();
        console.log(`[GPS] Loop initialized for booking: ${booking.id}`);

        const loop = async () => {
            if (!isRunning) return;

            try {
                // Fetch fresh booking data
                const currentBooking = await bookingService.getById(booking.id).catch(() => null);

                if (!currentBooking) {
                    console.log(`[GPS] Booking ${booking.id} not found, stopping loop.`);
                    isRunning = false;
                    delete this.timers[booking.id];
                    return;
                }

                const normalizedStatus = (currentBooking.bookingStatus || '').toLowerCase();
                const isActive = ['dispatched', 'active', 'delivered', 'in_use'].includes(normalizedStatus);

                if (!isActive) {
                    console.log(`[GPS] Booking ${booking.id} status is ${currentBooking.bookingStatus}, stopping loop.`);
                    isRunning = false;
                    delete this.timers[booking.id];
                    return;
                }

                console.log(`[GPS] Running mock GPS for booking: ${booking.id}`);

                // FALLBACK LOGIC: Ensure GPS always works regardless of machine settings or boundary
                let bLat = parseFloat(currentBooking.boundary?.lat ?? currentBooking.boundary?.centerLat);
                let bLng = parseFloat(currentBooking.boundary?.lng ?? currentBooking.boundary?.centerLng);
                let bRadius = parseFloat(currentBooking.boundary?.radius ?? currentBooking.boundary?.radiusKm ?? 5);

                let finalStatus;
                let loc;

                // Bangalore defaults if everything else fails
                const defaultLat = 12.9716;
                const defaultLng = 77.5946;

                const states = ['SAFE', 'NEAR_BOUNDARY', 'OUT_OF_RANGE', 'ALERT'];
                finalStatus = states[Math.floor(Math.random() * states.length)];
                loc = {
                    lat: 12.97 + Math.random() * 0.01,
                    lng: 77.59 + Math.random() * 0.01
                };

                console.log(`[GPS] ✅ GPS UPDATED: ${booking.id} -> ${finalStatus}`);
                console.log(`[GPS] Checking sync for booking:`, { 
                    id: booking.id, 
                    hasGroupBookingId: !!currentBooking?.groupBookingId,
                    groupBookingId: currentBooking?.groupBookingId 
                });

                await bookingService.updateBooking(booking.id, {
                    gpsStatus: finalStatus,
                    lastLocation: loc,
                    gpsLastUpdate: new Date().toISOString(),
                    lastGpsSync: Date.now()
                });

                // ── SYNC TO GROUP BOOKING ──
                if (currentBooking && currentBooking.groupBookingId) {
                    try {
                        const gpRef = doc(db, 'groupBookings', currentBooking.groupBookingId);
                        await updateDoc(gpRef, {
                            gpsStatus: finalStatus,
                            lastLocation: loc,
                            gpsLastUpdate: new Date().toISOString()
                        });
                        console.log(`[GPS] 🔄 SYNCED to Group Booking ${currentBooking.groupBookingId}`);
                    } catch (gpErr) {
                        console.error(`[GPS] ❌ Sync Error for GP ${currentBooking.groupBookingId}:`, gpErr);
                    }
                } else if (currentBooking) {
                    console.log(`[GPS] ℹ️ Skipping GP sync: NO groupBookingId found on booking ${booking.id}`);
                }

                this.lastUpdate[booking.id] = Date.now();

            } catch (err) {
                console.warn(`[GPS] Loop error for ${booking.id}:`, err);
            }

            if (isRunning) {
                this.timers[booking.id] = setTimeout(loop, 5000);
            }
        };

        // Start almost immediately
        this.timers[booking.id] = setTimeout(loop, 500);
    }

    stopLoop(bookingId, statusToSet = 'INACTIVE') {
        if (this.timers[bookingId]) {
            clearTimeout(this.timers[bookingId]);
            delete this.timers[bookingId];
        }
        delete this.lastUpdate[bookingId];

        // fire and forget status update
        bookingService.updateBooking(bookingId, { gpsStatus: statusToSet }).catch(() => { });
    }
}

export const mockGpsService = new MockGpsService();

