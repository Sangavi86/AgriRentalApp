import React, { useRef, useState, useCallback } from 'react';
import { View, Platform, Animated } from 'react-native';
import { UltraUX } from '../theme/Theme';

/**
 * Magnetic Wrapper Component
 * Shifts its children toward the mouse cursor when nearby.
 * Optimized for React Native Web.
 */
export default function Magnetic({ children, radius = UltraUX.magneticRadius, strength = 0.2 }) {
    if (Platform.OS !== 'web') return <View>{children}</View>;

    const ref = useRef(null);
    const [translate] = useState(new Animated.ValueXY({ x: 0, y: 0 }));

    const handleMouseMove = useCallback((e) => {
        if (!ref.current) return;

        const { clientX, clientY } = e;
        const rect = ref.current.getBoundingClientRect();
        
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = clientX - centerX;
        const distanceY = clientY - centerY;

        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

        if (distance < radius) {
            // Magnetic Pull
            const moveX = distanceX * strength;
            const moveY = distanceY * strength;

            Animated.spring(translate, {
                toValue: { x: moveX, y: moveY },
                stiffness: 150,
                damping: 15,
                useNativeDriver: true,
            }).start();
        } else {
            // Reset position
            Animated.spring(translate, {
                toValue: { x: 0, y: 0 },
                stiffness: 150,
                damping: 15,
                useNativeDriver: true,
            }).start();
        }
    }, [radius, strength, translate]);

    const handleMouseLeave = useCallback(() => {
        Animated.spring(translate, {
            toValue: { x: 0, y: 0 },
            stiffness: 120,
            damping: 12,
            useNativeDriver: true,
        }).start();
    }, [translate]);

    return (
        <View
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ zIndex: 10 }}
        >
            <Animated.View
                style={{
                    transform: [
                        { translateX: translate.x },
                        { translateY: translate.y },
                    ],
                }}
            >
                {children}
            </Animated.View>
        </View>
    );
}
