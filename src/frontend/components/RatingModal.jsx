import React, { useState } from 'react';
import {
    View, Text, Modal, TouchableOpacity, StyleSheet,
    TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';
import { ratingService } from '../../backend/services/ratingService';

export default function RatingModal({
    visible, booking, raterId, targetId,
    targetType, onClose, onSubmitted
}) {
    const [score, setScore] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (score === 0) { Alert.alert('Select a Rating', 'Please tap 1–5 stars before submitting.'); return; }
        setSubmitting(true);
        try {
            const result = await ratingService.submitRating({
                bookingId: booking.id,
                raterId,
                targetId,
                targetType,
                score,
                comment,
            });
            console.log('RatingModal: submit result', result, { bookingId: booking.id });
            if (result === null) {
                Alert.alert('Already Rated', 'You have already submitted a rating for this booking.');
            } else {
                Alert.alert('⭐ Thank you!', 'Your rating has been submitted.');
            }
            onSubmitted && onSubmitted();
            onClose();
        } catch (e) {
            console.error('RatingModal submit error', e);
            Alert.alert('Error', 'Could not submit rating: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const targetLabels = {
        machine: 'the Machine',
        driver: 'the Driver',
        borrower: 'the Borrower',
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.header}>⭐ Rate {targetLabels[targetType] || 'this Experience'}</Text>
                    <Text style={styles.sub}>For booking: {booking?.machineName}</Text>

                    {/* Star Selector */}
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map(n => (
                            <TouchableOpacity key={n} onPress={() => setScore(n)} style={styles.starBtn}>
                                <Text style={[styles.star, n <= score && styles.starActive]}>
                                    {n <= score ? '⭐' : '☆'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.scoreLabel}>
                        {score === 0 ? 'Tap to rate' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][score]}
                    </Text>

                    {/* Comment */}
                    <TextInput
                        style={styles.input}
                        placeholder="Leave an optional comment..."
                        placeholderTextColor="#aaa"
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={3}
                    />

                    {/* Buttons */}
                    <View style={styles.btnRow}>
                        <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose} disabled={submitting}>
                            <Text style={styles.cancelText}>Skip</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.submitBtn, submitting && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.submitText}>Submit Rating</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.m },
    card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: BorderRadius.l, padding: Spacing.l, ...Shadows.strong },
    header: { fontSize: 20, fontWeight: '800', color: Colors.navy, marginBottom: 4 },
    sub: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.l },
    starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8, gap: 8 },
    starBtn: { padding: 4 },
    star: { fontSize: 36, color: '#DDD' },
    starActive: { color: '#F59E0B' },
    scoreLabel: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: Colors.navy, marginBottom: Spacing.m },
    input: {
        borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12,
        fontSize: 14, color: Colors.navy, textAlignVertical: 'top',
        minHeight: 80, marginBottom: Spacing.m,
    },
    btnRow: { flexDirection: 'row', gap: Spacing.s },
    btn: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.s, alignItems: 'center' },
    cancelBtn: { backgroundColor: '#F3F4F6' },
    cancelText: { color: Colors.textSecondary, fontWeight: '700' },
    submitBtn: { backgroundColor: Colors.navy },
    submitText: { color: '#fff', fontWeight: '700' },
});
