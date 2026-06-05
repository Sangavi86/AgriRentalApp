export const Colors = {
    // Forest & Cream - Premium Agricultural Design System
    
    // Foundation Colors
    cream: '#FDFBF6', // Warm, premium base color (replaces white)
    forestGreen: '#1A4D3A', // Deep forest green for primary actions
    forestGreenLight: '#2D6A4F', // Medium forest green for secondary
    
    // Backgrounds
    bgDark: '#0A192F',
    bgLight: '#FDFBF6', // Warm cream instead of cold white
    white: '#FDFBF6', // All whites are now cream

    // Glassmorphism
    glassContainer: 'rgba(253, 251, 246, 0.75)',
    glassInput: 'rgba(253, 251, 246, 0.9)',
    glassBorder: 'rgba(26, 77, 58, 0.15)',

    // Accents
    gold: '#D4AF37',
    goldLight: '#F4D03F',
    goldDark: '#B4941F',

    navy: '#1A4D3A', // Replaced with forest green
    navyLight: '#2D6A4F',

    // Semantic
    primary: '#1A4D3A', // Forest green is now primary
    accent: '#D4AF37',

    olive: '#556B2F',
    verified: '#1DA1F2',

    // Agri Theme
    agriGreen: '#1A4D3A',
    agriGreenLight: '#2D6A4F',
    agriSage: '#74C69D',
    agriEarth: '#B07D62',
    agriHusk: '#F1E4C3',

    // Status Colors - Pastel Pills
    success: '#2E7D32',
    successLight: '#E8F5E9',
    error: '#C62828',
    errorLight: '#FFEBEE',
    warning: '#E65100',
    warningLight: '#FFF3E0',
    info: '#1565C0',
    infoLight: '#E3F2FD',
    neutral: '#607D8B',
    neutralLight: '#ECEFF1',

    // Text Colors
    textPrimary: '#1A4D3A',
    textSecondary: '#80897B', // Muted greywish-green
    textLight: '#FFFFFF',
    textMuted: '#9E9E9E', // For labels

    black: '#000000',
    greyBg: '#EEEEEE',
    greyMedium: '#9E9E9E',
    greyLight: '#F5F5F5',
};

export const Spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const FontSize = {
    small: 12,
    caption: 12,
    body: 16,
    subtitle: 14,
    title: 18,
    headline: 24,
    hero: 32,
};

export const BorderRadius = {
    s: 8,
    m: 14,
    l: 20,
    xl: 24,
    card: 16, // Standard card radius
    round: 9999,
};

export const Shadows = {
    // Soft elevation
    soft: {
        shadowColor: "#1A4D3A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
        boxShadow: "0px 2px 8px rgba(26, 77, 58, 0.08)",
    },
    // Medium elevation
    medium: {
        shadowColor: "#1A4D3A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        boxShadow: "0px 4px 16px rgba(26, 77, 58, 0.12)",
    },
    // Strong elevation for prominent cards
    strong: {
        shadowColor: "#1A4D3A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 20,
        elevation: 12,
        boxShadow: "0px 8px 24px rgba(26, 77, 58, 0.16)",
    },
    // Hover state elevation
    hover: {
        shadowColor: "#1A4D3A",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.20,
        shadowRadius: 28,
        elevation: 16,
        boxShadow: "0px 12px 32px rgba(26, 77, 58, 0.20)",
    }
};

export const Glass = {
    container: {
        backgroundColor: Colors.glassContainer,
        borderRadius: BorderRadius.l,
        borderColor: Colors.glassBorder,
        borderWidth: 1,
        overflow: 'hidden',
    },
    input: {
        backgroundColor: Colors.glassInput,
        borderRadius: BorderRadius.m,
        color: Colors.black, // Dark text in light glass input for readability
        borderWidth: 1,
        borderColor: Colors.glassBorder,
    }
}

export const Animation = {
    // Micro-interactions (snappy, direct touch/hover)
    fast: 150, // Ultra-fast for immediate tactile feedback
    snap: 200, // Fast for button presses and card interactions
    
    // Macro-interactions (structural changes)
    normal: 300, // Standard screen transitions and modals
    slow: 400, // Slower for complex animations
};

export const Transitions = {
    // Smooth easing for all animations
    default: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design standard easing
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy spring effect
};

// CSS-in-JS animation keyframes (for web)
export const KeyFrames = {
    slideUpFade: `
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
    `,
    shimmer: `
        @keyframes shimmer {
            0% {
                background-position: -1000px 0;
            }
            100% {
                background-position: 1000px 0;
            }
        }
    `,
    pulse: `
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.5;
            }
        }
    `,
};

// Reusable Web Styles (for Expo web)
export const WebStyles = {
    // Sticky header with glassmorphism
    stickyHeader: {
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(253, 251, 246, 0.85)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(26, 77, 58, 0.1)',
    },
    
    // Tactile card hover on desktop
    cardHover: {
        transition: `all ${Animation.snap}ms ${Transitions.default}`,
        cursor: 'pointer',
        ':hover': {
            transform: 'scale(1.02) translateY(-4px)',
            boxShadow: '0 20px 40px -5px rgba(26, 77, 58, 0.12)',
        },
    },
    
    // Tactile button press
    buttonPress: {
        transition: `all ${Animation.fast}ms ${Transitions.default}`,
        ':active': {
            transform: 'scale(0.96)',
        },
    },
    
    // Staggered list animation
    staggeredListItem: (index) => ({
        animation: `slideUpFade ${Animation.normal}ms ${Transitions.default} ${index * 50}ms both`,
    }),
};
