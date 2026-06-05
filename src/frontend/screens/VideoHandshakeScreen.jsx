import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../theme/Theme';
import { RealFirestore } from '../../backend/services/RealFirebase';
import ScreenWrapper from '../components/ScreenWrapper';

export default function VideoHandshakeScreen({ route, navigation }) {
    const { bookingId, machineId, mode = 'farmer' } = route.params || {};
    const [uploading, setUploading] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);

    // Mock video URI generation (in production, this would come from camera or file picker)
    const handleUploadMockVideo = async () => {
        setUploading(true);
        try {
            // Create a simple mock blob for demonstration
            // In production app with expo-camera, you would:
            // 1. Use Camera component to record video
            // 2. Get file URI from camera
            // 3. Call uploadVideo with that URI

            const mockVideoUri = 'file://mock-video.mp4';
            
            // For web environment, we simulate the upload
            if (bookingId) {
                const videoUrl = `https://firebasestorage.googleapis.com/mock-video-${Date.now()}.mp4`;
                
                if (mode === 'farmer') {
                    await RealFirestore.updateVideoUrls(bookingId, videoUrl, null);
                } else {
                    await RealFirestore.updateVideoUrls(bookingId, null, videoUrl);
                }

                // Update booking status
                await RealFirestore.updateBookingStatus(bookingId, 'confirmed', 'paid');
            }

            const msg = mode === 'driver' ? "Job Accepted! Documents Uploaded." : "Video Recorded & Payment Confirmed!";
            alert(msg);
            navigation.navigate(mode === 'driver' ? 'DriverHome' : 'FarmerHome');
        } catch (e) {
            console.error("Upload failed", e);
            alert('Upload failed: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    const isDriver = mode === 'driver';

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.glassCard}>
                    <View style={styles.headerSection}>
                        <Text style={styles.icon}>{isDriver ? '🤳' : '📹'}</Text>
                        <Text style={styles.title}>{isDriver ? "Confirm Job" : "Video Handshake"}</Text>
                    </View>
                    
                    <Text style={styles.subtitle}>
                        {isDriver
                            ? "Upload a selfie or ID to confirm your identity for this job."
                            : "Record a 15-second video of the machine to confirm its condition."}
                    </Text>

                    <View style={styles.instructionBox}>
                        <Text style={styles.instructionTitle}>📋 Instructions:</Text>
                        <Text style={styles.instruction}>• Record in good lighting</Text>
                        <Text style={styles.instruction}>• Show full view of {isDriver ? 'your face/ID' : 'the machine'}</Text>
                        <Text style={styles.instruction}>• Keep it under 30 seconds</Text>
                        <Text style={styles.instruction}>• Ensure clear audio (if applicable)</Text>
                    </View>

                    <View style={styles.cameraPlaceholder}>
                        <Text style={{ fontSize: 60, marginBottom: Spacing.m }}>{isDriver ? '🤳' : '📹'}</Text>
                        <Text style={styles.placeholderText}>
                            {isDriver ? "Camera Ready for Selfie" : "Ready to Record Video"}
                        </Text>
                        <Text style={styles.placeholderSubText}>
                            (In production: Camera component would appear here)
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={handleUploadMockVideo}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <>
                                <ActivityIndicator color={Colors.white} style={{ marginRight: Spacing.s }} />
                                <Text style={styles.buttonText}>Uploading...</Text>
                            </>
                        ) : (
                            <>
                                <Text style={{ fontSize: 18, marginRight: Spacing.s }}>☁️</Text>
                                <Text style={styles.buttonText}>
                                    {isDriver ? "Upload & Accept Job" : "Upload & Confirm"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        💡 By uploading, you confirm the video authenticity and agree to our terms.
                    </Text>
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.m,
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: Spacing.m,
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: Spacing.m,
        paddingVertical: Spacing.s,
        borderRadius: BorderRadius.m
    },
    backText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: FontSize.body
    },
    glassCard: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: Spacing.xl,
        borderRadius: BorderRadius.l,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        boxShadow: '0px 10px 20px rgba(0,0,0,0.2)',
        elevation: 10,
    },

    headerSection: {
        alignItems: 'center',
        marginBottom: Spacing.xl
    },
    icon: {
        fontSize: 50,
        marginBottom: Spacing.m
    },
    title: {
        fontSize: FontSize.headline,
        fontWeight: 'bold',
        color: Colors.navy,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: FontSize.body,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 22
    },
    instructionBox: {
        backgroundColor: '#EFF6FF',
        borderLeftWidth: 4,
        borderLeftColor: Colors.primary,
        padding: Spacing.m,
        marginBottom: Spacing.xl,
        borderRadius: BorderRadius.s,
        width: '100%'
    },
    instructionTitle: {
        fontWeight: 'bold',
        color: Colors.navy,
        marginBottom: Spacing.s
    },
    instruction: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4
    },
    cameraPlaceholder: {
        width: '100%',
        height: 200,
        backgroundColor: '#F3F4F6',
        borderRadius: BorderRadius.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        borderWidth: 2,
        borderDasharray: [5, 5],
        borderStyle: 'dashed',
        borderColor: Colors.textSecondary
    },
    placeholderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.navy,
        textAlign: 'center'
    },
    placeholderSubText: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: Spacing.s,
        textAlign: 'center'
    },
    uploadButton: {
        backgroundColor: Colors.navy,
        paddingVertical: Spacing.m,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.round,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        flexDirection: 'row',
        marginBottom: Spacing.m,
        elevation: 5,
        boxShadow: '0px 5px 10px rgba(0,0,0,0.15)',
    },
    buttonText: {
        color: Colors.white,
        fontWeight: '900',
        fontSize: FontSize.body,
        textTransform: 'uppercase',
    },
    disclaimer: {
        fontSize: 11,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic'
    }
});

