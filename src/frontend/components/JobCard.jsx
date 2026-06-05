import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';

export default function JobCard({ job }) {
    const [hover, setHover] = useState(false);

    // Dynamic Tag Color
    const getTagColor = (task) => {
        const t = task.toLowerCase();
        if (t.includes('harvest')) return '#16a34a'; // Green
        if (t.includes('till')) return '#2563eb'; // Blue
        if (t.includes('transport')) return '#9333ea'; // Purple
        return Colors.navy;
    };

    return (
        <Pressable
            onHoverIn={() => setHover(true)}
            onHoverOut={() => setHover(false)}
            style={[
                styles.card,
                hover && styles.cardHover
            ]}
        >
            {/* Image Section */}
            <View style={styles.imageContainer}>
                <Image source={{ uri: job.image }} style={styles.image} resizeMode="cover" />
                {/* Gradient Overlay Simulation */}
                <View style={styles.gradientOverlay} />

                {/* Badge */}
                {job.urgent && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>URGENT</Text>
                    </View>
                )}
            </View>

            {/* Content Section */}
            <View style={styles.content}>
                <Text numberOfLines={1} style={styles.title}>{job.title}</Text>
                <Text style={styles.location}>{job.location}</Text>

                {/* Tags */}
                <View style={{ marginBottom: 12 }}>
                    <View style={[styles.tag, { backgroundColor: getTagColor(job.task) }]}>
                        <Text style={styles.tagText}>{job.task}</Text>
                    </View>
                </View>

                {/* Price & Action */}
                <View style={styles.metaRow}>
                    <Text style={styles.price}>₹{job.pay}</Text>

                    {/* Action Button (Visual only here, parent handles click) */}
                    <View style={styles.actionBtn}>
                        <Text style={styles.actionText}>View</Text>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    /* ================= CARD ================= */
    card: {
        width: 320,
        height: 420,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        flexDirection: 'column',
        // Shadow default
        boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
        elevation: 8,
        marginBottom: Spacing.m,
        // Transition simulation not perfectly native, but layout animation would be overkill for now
    },
    cardHover: {
        transform: [{ translateY: -6 }],
        boxShadow: '0px 12px 40px rgba(0,0,0,0.18)',
        elevation: 12,
    },

    /* ================= IMAGE ================= */
    imageContainer: {
        height: '45%', // 45% of 420 ~ 189px
        width: '100%',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.25)', // Averaged linear gradient
        top: 0, left: 0, right: 0, bottom: 0,
    },

    /* ================= BADGES ================= */
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: '#d32f2f',
        zIndex: 2,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },

    /* ================= CONTENT ================= */
    content: {
        padding: 16, // 14px 16px
        flex: 1,
        justifyContent: 'flex-start',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        color: '#0f172a',
    },
    location: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 12,
    },

    /* ================= TAGS ================= */
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    tagText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },

    /* ================= META ================= */
    metaRow: {
        marginTop: 'auto', // Push to bottom
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    price: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f59e0b',
    },
    actionBtn: {
        height: 36, // Slightly smaller than 48 for internal fit
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#0f172a',
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    }
});
