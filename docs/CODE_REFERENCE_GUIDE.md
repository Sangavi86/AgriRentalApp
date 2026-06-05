# Premium UX Implementation - Code Reference Guide

## Quick Copy-Paste Patterns for Future Implementation

---

## 🎨 Color System Imports

```javascript
import { Colors, Spacing, BorderRadius, Shadows, Animation, Transitions } from '../theme/Theme';
```

---

## 1️⃣ Hover & Press Animations Pattern

### For Web (CSS Transitions)
```javascript
// In StyleSheet.create() or inline:
const cardStyle = Platform.OS === 'web' ? {
    transition: `all ${Animation.snap}ms ${Transitions.default}`,
    cursor: 'pointer',
    ':hover': {
        transform: 'scale(1.02) translateY(-4px)',
        boxShadow: '0 20px 40px -5px rgba(26, 77, 58, 0.12)',
    },
    ':active': {
        transform: 'scale(0.96)',
    },
} : {};
```

### For Mobile (Animated Values)
```javascript
const scaleAnim = React.useRef(new Animated.Value(1)).current;

const handlePressIn = () => {
    Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: Animation.fast,
        useNativeDriver: true,
    }).start();
};

const handlePressOut = () => {
    Animated.timing(scaleAnim, {
        toValue: 1,
        duration: Animation.snap,
        useNativeDriver: true,
    }).start();
};

// In JSX:
<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
    <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {/* content */}
    </TouchableOpacity>
</Animated.View>
```

---

## 2️⃣ Sticky Header with Glassmorphism Pattern

```javascript
// Import Platform for web detection
import { Platform } from 'react-native';

// In StyleSheet.create():
stickyHeader: {
    position: Platform.OS === 'web' ? 'sticky' : 'relative',
    top: 0,
    zIndex: 40,  // Above regular content
    backdropFilter: Platform.OS === 'web' ? 'blur(12px)' : 'none',
    backgroundColor: 'rgba(253, 251, 246, 0.85)',  // Frosted glass
    borderBottomWidth: 0,
    borderBottomColor: 'rgba(26, 77, 58, 0.1)',  // Subtle divider
}
```

---

## 3️⃣ Staggered Entrance Animation Pattern

### 1. Global Keyframes (in App.jsx)
```javascript
useEffect(() => {
    if (Platform.OS === 'web') {
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes slideUpFade {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }
}, []);
```

### 2. Apply to List Items
```javascript
const renderItem = ({ item, index }) => (
    <View
        style={[
            styles.listItem,
            Platform.OS === 'web' && {
                animation: `slideUpFade ${Animation.normal}ms ${Transitions.default} ${index * 50}ms both`,
            },
        ]}
    >
        {/* content */}
    </View>
);
```

---

## 4️⃣ Interactive Filter Pill Pattern

```javascript
// Inactive pill
inactivePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,  // Fully rounded
    backgroundColor: Colors.cream,
    borderWidth: 2,
    borderColor: Colors.forestGreen,
    marginRight: 8,
}

// Active pill
activePill: {
    backgroundColor: Colors.forestGreen,
    borderColor: Colors.forestGreen,
}

// Pill text
pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
}
pillTextActive: {
    color: Colors.cream,
}
pillTextInactive: {
    color: Colors.forestGreen,
}

// In JSX:
<TouchableOpacity
    style={[styles.inactivePill, isActive && styles.activePill]}
    onPress={() => setSelected(!isActive)}
>
    <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
        {label}
    </Text>
</TouchableOpacity>
```

---

## 5️⃣ Max-Width Centered Layout Pattern

```javascript
// For FlatList content
contentContainerStyle={{
    maxWidth: 800,           // Strict max-width
    alignSelf: 'center',     // Center horizontally
    width: '100%',           // Responsive on smaller screens
    paddingBottom: 120,      // Room for tab navigation
    paddingHorizontal: 16,
}}

// For Grid with orphan fix
columnWrapperStyle={{
    paddingHorizontal: 8,
    paddingBottom: 8,
    justifyContent: 'flex-start',  // Prevents stretching on last row
}}

// Individual grid item
gridItem: {
    width: numColumns === 3 ? '33.33%' : '50%',  // Strict width, no flex-grow
    paddingHorizontal: 4,
}
```

---

## 6️⃣ Shimmer Skeleton Loader Pattern

```javascript
const shimmerAnim = useRef(new Animated.Value(-1)).current;

useEffect(() => {
    const animation = Animated.loop(
        Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: Animation.normal,  // 300ms
            useNativeDriver: true,
        })
    );
    animation.start();
    return () => animation.stop();
}, []);

const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
});

// In JSX:
<View style={[styles.skeletonContainer, { width: w, height: h, borderRadius }]}>
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
            colors={['transparent', 'rgba(26, 77, 58, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
        />
    </Animated.View>
</View>

// Style:
skeletonContainer: {
    backgroundColor: '#F5F0E8',  // Warm cream
    overflow: 'hidden',
    position: 'relative',
}
```

---

## 7️⃣ Empty State Pattern

```javascript
const emptyState = {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
}
const emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.infoLight,  // Pastel background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
}
const emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.forestGreen,
    marginBottom: 8,
}
const emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
}
const emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.forestGreen,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.card,
    marginTop: Spacing.m,
}

// In JSX:
ListEmptyComponent={() => (
    <View style={emptyState}>
        <View style={emptyIcon}>
            <Ionicons name="cube-outline" size={48} color={Colors.forestGreen} />
        </View>
        <Text style={emptyTitle}>No bookings yet</Text>
        <Text style={emptySubtitle}>
            Start by searching for a machine
        </Text>
        <TouchableOpacity style={emptyActionBtn}>
            <Ionicons name="search" size={16} color={Colors.cream} />
            <Text style={{ color: Colors.cream, fontWeight: '700', marginLeft: 6 }}>
                Find a Machine
            </Text>
        </TouchableOpacity>
    </View>
)}
```

---

## 8️⃣ Color System Import & Usage

### All Available Colors
```javascript
// Foundation
Colors.cream                    // #FDFBF6
Colors.forestGreen              // #1A4D3A
Colors.forestGreenLight         // #2D6A4F

// Status Colors (Pastel)
Colors.successLight             // #E8F5E9
Colors.errorLight               // #FFEBEE
Colors.warningLight             // #FFF3E0
Colors.infoLight                // #E3F2FD
Colors.neutralLight             // #ECEFF1

// Text
Colors.textPrimary              // #1A4D3A (forest green)
Colors.textSecondary            // #80897B (muted)
Colors.textMuted                // #9E9E9E (labels)
Colors.textLight                // #FFFFFF (on dark)

// Utility
Colors.greyBg                   // #EEEEEE
Colors.greyMedium               // #9E9E9E
Colors.greyLight                // #F5F5F5
```

### Best Practices
```javascript
// ✅ DO: Use theme colors
backgroundColor: Colors.cream
color: Colors.forestGreen
borderColor: Colors.textMuted

// ❌ DON'T: Hardcode hex values
backgroundColor: '#FDFBF6'       // Use Colors.cream
color: '#1A4D3A'                 // Use Colors.forestGreen
borderColor: '#999999'           // Use Colors.textMuted
```

---

## 9️⃣ Shadow System Usage

```javascript
// Apply shadows from Theme.js
...Shadows.soft      // Light shadow for standard elements
...Shadows.medium    // Medium shadow for cards, modals
...Shadows.strong    // Strong shadow for prominent modals
...Shadows.hover     // Deep shadow on interactive hover

// Example:
cardStyle: {
    ...Shadows.medium,  // Spreads shadow properties
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.card,
}

// Hover upgrade:
hoveredCardStyle: {
    ...Shadows.hover,   // Elevates shadow
    transform: 'scale(1.02) translateY(-4px)',
}
```

---

## 🔟 Animation Speeds Reference

```javascript
Animation.fast       // 150ms - Button presses, chip toggles
Animation.snap       // 200ms - Card hovers, immediate feedback
Animation.normal     // 300ms - Screen transitions, shimmer loops
Animation.slow       // 400ms - Complex animations, staggered sequences

// Usage:
duration: Animation.snap,
delay: index * 50,  // Staggered: 0ms, 50ms, 100ms, etc.
```

---

## 1️⃣1️⃣ Transition Functions

```javascript
// Use with animation durations
Transitions.default      // cubic-bezier(0.4, 0, 0.2, 1) - Standard
Transitions.easeInOut    // cubic-bezier(0.4, 0, 0.2, 1) - Same as default
Transitions.easeOut      // cubic-bezier(0, 0, 0.2, 1) - Fast exit
Transitions.easeIn       // cubic-bezier(0.4, 0, 1, 1) - Slow enter
Transitions.spring       // cubic-bezier(0.34, 1.56, 0.64, 1) - Bouncy

// In CSS:
transition: `all ${Animation.snap}ms ${Transitions.default}`

// Recommended pairs:
// Fast animations: Transitions.easeOut
// Slow animations: Transitions.easeIn
// Standard: Transitions.default
// Playful: Transitions.spring
```

---

## 1️⃣2️⃣ Platform Detection Pattern

```javascript
import { Platform } from 'react-native';

// For web-specific features:
Platform.OS === 'web' && {
    backdropFilter: 'blur(12px)',
    cursor: 'pointer',
    transition: `all ${Animation.snap}ms ${Transitions.default}`,
}

// For mobile-specific:
Platform.OS !== 'web' && {
    // React Native specific styles
}

// Example: Sticky positioning
position: Platform.OS === 'web' ? 'sticky' : 'relative'
```

---

## 1️⃣3️⃣ Pressable vs TouchableOpacity

### When to Use Pressable (New Pattern)
```javascript
<Pressable
    style={[
        styles.card,
        Platform.OS === 'web' && webHoverStyles,
    ]}
    onPress={handlePress}
>
    {/* Content */}
</Pressable>
```

### When to Use TouchableOpacity (Classic)
```javascript
<TouchableOpacity
    onPress={handlePress}
    onPressIn={handlePressIn}
    onPressOut={handlePressOut}
    activeOpacity={0.95}
>
    {/* Content */}
</TouchableOpacity>
```

---

## 1️⃣4️⃣ Complete Example: Premium Machine Card

```javascript
import React from 'react';
import { View, Text, Image, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadows, Animation, Transitions } from '../theme/Theme';

export default function PremiumMachineCard({ machine, onPress }) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    
    const handlePressIn = () => {
        Animated.timing(scaleAnim, {
            toValue: 0.96,
            duration: Animation.fast,
            useNativeDriver: true,
        }).start();
    };
    
    const handlePressOut = () => {
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: Animation.snap,
            useNativeDriver: true,
        }).start();
    };
    
    return (
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.95}
            >
                <Image source={{ uri: machine.imageUrl }} style={styles.image} />
                
                <View style={styles.content}>
                    <Text style={styles.machineTitle}>{machine.name}</Text>
                    <Text style={styles.machineDesc}>{machine.description}</Text>
                    
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>₹{machine.rate}</Text>
                        <Text style={styles.unit}>/hr</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.cream,
        borderRadius: BorderRadius.card,
        overflow: 'hidden',
        marginBottom: Spacing.m,
        ...Shadows.soft,
        borderWidth: 0,
        // Web hover effect
        ...(Platform.OS === 'web' && {
            transition: `all ${Animation.snap}ms ${Transitions.default}`,
            cursor: 'pointer',
            ':hover': {
                transform: 'scale(1.02) translateY(-4px)',
                boxShadow: Shadows.hover.boxShadow,
            },
        }),
    },
    image: {
        width: '100%',
        height: 150,
        backgroundColor: Colors.greyBg,
    },
    content: {
        padding: Spacing.m,
    },
    machineTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.forestGreen,
        marginBottom: 4,
    },
    machineDesc: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    price: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.forestGreen,
    },
    unit: {
        fontSize: 12,
        color: Colors.textMuted,
        fontWeight: '600',
        marginLeft: 2,
    },
});
```

---

## 1️⃣5️⃣ Testing Premium Features

```javascript
// Test hover effect (web)
// 1. Move mouse over card
// 2. Verify: scale increases, shadow deepens, smooth transition

// Test press effect (mobile + web)
// 1. Tap button
// 2. Verify: instant scale 0.96, feels responsive

// Test sticky header (web)
// 1. Scroll down long list
// 2. Verify: header stays visible, cards slide under

// Test staggered animation
// 1. Load page with list
// 2. Verify: items appear sequentially with 50ms delays

// Test empty state
// 1. Navigate to empty list
// 2. Verify: friendly message + action button visible

// Test color consistency
// 1. Inspect all backgrounds
// 2. Verify: all cream or forestGreen (no hardcoded hex)

// Test animations on low-end device
// 1. Profile with DevTools
// 2. Verify: no FPS drops, smooth 60fps

// Test accessibility
// 1. Use keyboard navigation
// 2. Verify: all interactive elements reachable
// 3. Check color contrast (WCAG AA minimum)
```

---

## 📋 Checklist for Adding Premium Styling to New Screens

- [ ] Import Colors, Spacing, BorderRadius, Shadows, Animation
- [ ] Replace all hardcoded hex colors with Colors.*
- [ ] Update backgrounds to Colors.cream
- [ ] Update primary actions to Colors.forestGreen
- [ ] Apply Shadows.soft to cards
- [ ] Add hover effects (web) using Platform.OS check
- [ ] Add press animations (mobile) using Animated
- [ ] Add max-width constraint if large list
- [ ] Add sticky header if has search/filters
- [ ] Add empty state with friendly messaging
- [ ] Test on mobile and desktop
- [ ] Verify color contrast ratios
- [ ] Performance profile animations

---

**Last Updated:** April 12, 2026  
**Ready for Implementation:** ✅ YES
