import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    getDoc
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase/config';

const ratingsRef = collection(db, 'ratings');

export const ratingService = {

    /**
     * Submit a rating.
     * targetType: 'machine' | 'driver' | 'borrower'
     */
    async submitRating({ bookingId, raterId, targetId, targetType, score, comment }) {
        await ensureAuth();
        // Prevent duplicate rating for same booking + targetType
        const existing = await getDocs(
            query(ratingsRef,
                where('bookingId', '==', bookingId),
                where('raterId', '==', raterId),
                where('targetType', '==', targetType)
            )
        );
        if (!existing.empty) return null; // already rated

        const ref = await addDoc(ratingsRef, {
            bookingId,
            raterId,
            targetId,
            targetType,
            score,   // 1–5
            comment: comment || '',
            createdAt: new Date().toISOString()
        });

        // Mark booking as rated
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, { rated: true });

        return ref.id;
    },

    /**
     * Get average rating for a target (machine, driver, or user).
     * Returns { average, count }
     */
    async getAverageFor(targetId) {
        await ensureAuth();
        const q = query(ratingsRef, where('targetId', '==', targetId));
        const snap = await getDocs(q);
        if (snap.empty) return { average: 0, count: 0 };
        const scores = snap.docs.map(d => d.data().score || 0);
        const average = scores.reduce((a, b) => a + b, 0) / scores.length;
        return { average: Math.round(average * 10) / 10, count: scores.length };
    },

    /**
     * Get all ratings for a target.
     */
    async getRatingsFor(targetId) {
        await ensureAuth();
        const q = query(ratingsRef, where('targetId', '==', targetId));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
};

