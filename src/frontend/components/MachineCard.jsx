import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows, Animation, Transitions } from '../theme/Theme';

const { width } = Dimensions.get('window');

export default function MachineCard({ machine, onPress }) {
    const unavailable = machine.isAvailable === false;
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const shadowAnim = React.useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.96,
                duration: Animation.fast,
                useNativeDriver: true,
            }),
            Animated.timing(shadowAnim, {
                toValue: 1,
                duration: Animation.fast,
                useNativeDriver: false,
            })
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: Animation.snap,
                useNativeDriver: true,
            }),
            Animated.timing(shadowAnim, {
                toValue: 0,
                duration: Animation.snap,
                useNativeDriver: false,
            })
        ]).start();
    };

    // Web hover effect (CSS-based)
    const cardStyle = Platform.OS === 'web' ? {
        transition: `all ${Animation.snap}ms ${Transitions.default}`,
        cursor: 'pointer',
        ':hover': {
            transform: 'scale(1.02) translateY(-4px)',
            boxShadow: '0 20px 40px -5px rgba(26, 77, 58, 0.12)',
        },
    } : {};

    return (
        <Animated.View style={[
            styles.card, 
            { 
                transform: [{ scale: scaleAnim }],
                boxShadow: shadowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [`${Shadows.soft.boxShadow}`, `${Shadows.hover.boxShadow}`],
                }),
            },
            unavailable && styles.unavailableCard,
            Platform.OS === 'web' && cardStyle
        ]}>
            <TouchableOpacity 
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.95}
            >
                {/* Image Section */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: machine.imageUrl }} style={styles.image} resizeMode="cover" />
                    {/* Type Tag */}
                    <View style={styles.typeTag}>
                        <Text style={styles.typeText}>{machine.type || 'Equipment'}</Text>
                    </View>
                    {/* Rating badge */}
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={10} color="#C5A059" style={{ marginRight: 4 }} />
                        <Text style={styles.ratingText}>4.8</Text>
                    </View>
                    {unavailable && (
                        <View style={styles.outBadge}>
                            <Text style={styles.outBadgeText}>Unavailable</Text>
                        </View>
                    )}
                </View>

                {/* Content Section */}
                <View style={styles.content}>
                    <View style={{ height: 44 }}>
                        <Text numberOfLines={2} style={styles.name}>{machine.name}</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.desc}>{machine.description || 'Professional Agri Equipment'}</Text>
                    
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={12} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text numberOfLines={1} style={styles.locationText}>
                            {machine.location?.village || machine.location?.district || 'Location Available'}
                        </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.footerSep} />
                    <View style={styles.footer}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={styles.price}>₹{machine.basePay || machine.rate || 0}</Text>
                                <Text style={styles.unit}> /hr</Text>
                            </View>
                        </View>
                        <View style={styles.bookIcon}>
                            <Ionicons name="chevron-forward" size={18} color={!unavailable ? Colors.forestGreen : Colors.textMuted} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: Colors.cream,
        borderRadius: BorderRadius.card,
        overflow: 'hidden',
        marginBottom: Spacing.m,
        ...Shadows.soft,
        borderWidth: 0,
    },
    imageContainer: {
        height: 150,
        width: '100%',
        position: 'relative',
        backgroundColor: Colors.greyBg,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    typeTag: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(26, 77, 58, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.s,
    },
    typeText: {
        color: Colors.cream,
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    ratingBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: Colors.cream, 
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: BorderRadius.s,
        flexDirection: 'row',
        alignItems: 'center',
        ...Shadows.soft,
    },
    ratingText: { 
        color: Colors.forestGreen, 
        fontSize: 10, 
        fontWeight: '900' 
    },
    content: {
        padding: Spacing.m,
    },
    name: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.forestGreen,
        marginBottom: 2,
    },
    desc: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    locationText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    footerSep: {
        height: 1,
        backgroundColor: Colors.greyBg,
        marginBottom: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    price: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.forestGreen,
    },
    unit: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    bookIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.forestGreen,
        opacity: 0.1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unavailableCard: {
        opacity: 0.6,
    },
    outBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: Colors.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.s,
    },
    outBadgeText: { 
        color: Colors.cream, 
        fontSize: 9, 
        fontWeight: '900' 
    },
});
