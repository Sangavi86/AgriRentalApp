import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Image, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/Theme';
import { bookingService } from '../../backend/services/bookingService';

export default function PhotoUploadModal({ visible, booking, type, onClose, onComplete }) {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState({});

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Speedy Farmer needs access to your photos to verify the rental.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Speedy Farmer needs access to your camera to verify the rental.');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const removeImage = (index) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    const handleUpload = async () => {
        if (images.length === 0) {
            Alert.alert('No Photos', 'Please add at least one photo for verification.');
            return;
        }

        setUploading(true);
        try {
            for (let i = 0; i < images.length; i++) {
                const uri = images[i];
                await bookingService.uploadBookingMedia(booking.id, uri, type);
            }
            Alert.alert('Success', 'Verification photos uploaded successfully.');
            onComplete();
        } catch (e) {
            console.error('Upload Error:', e);
            Alert.alert('Upload Failed', e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <Text style={styles.title}>
                        {type === 'handover' ? 'Handover Verification' : 'Return Verification'}
                    </Text>
                    <Text style={styles.subtitle}>
                        Please upload photos of the machine condition to proceed.
                    </Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
                        {images.map((img, idx) => (
                            <View key={idx} style={styles.imgWrapper}>
                                <Image source={{ uri: img }} style={styles.img} />
                                <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx)}>
                                    <Text style={styles.removeText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        {images.length < 5 && (
                            <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
                                <Text style={styles.addIcon}>🖼️</Text>
                                <Text style={styles.addText}>Gallery</Text>
                            </TouchableOpacity>
                        )}
                        {images.length < 5 && (
                            <TouchableOpacity style={styles.addBtn} onPress={takePhoto}>
                                <Text style={styles.addIcon}>📷</Text>
                                <Text style={styles.addText}>Camera</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    <View style={styles.btnRow}>
                        <TouchableOpacity 
                            style={[styles.btn, styles.cancelBtn]} 
                            onPress={onClose}
                            disabled={uploading}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.btn, styles.confirmBtn, images.length === 0 && styles.disabledBtn]} 
                            onPress={handleUpload}
                            disabled={uploading || images.length === 0}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.confirmBtnText}>Confirm & Start</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    content: { 
        backgroundColor: '#fff', 
        borderTopLeftRadius: BorderRadius.l, 
        borderTopRightRadius: BorderRadius.l, 
        padding: Spacing.l,
        paddingBottom: 40
    },
    title: { fontSize: 18, fontWeight: '800', color: Colors.navy, marginBottom: 4 },
    subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.m },
    scroll: { marginBottom: Spacing.l },
    imgWrapper: { marginRight: 10, position: 'relative' },
    img: { width: 100, height: 100, borderRadius: 8 },
    removeBtn: { 
        position: 'absolute', top: -5, right: -5, 
        backgroundColor: '#EF4444', width: 22, height: 22, 
        borderRadius: 11, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    removeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    addBtn: { 
        width: 100, height: 100, borderRadius: 8, 
        borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center', marginRight: 10,
        backgroundColor: '#F8FAFC'
    },
    addIcon: { fontSize: 24, marginBottom: 4 },
    addText: { fontSize: 11, color: Colors.navy, fontWeight: '600' },
    btnRow: { flexDirection: 'row', gap: 10 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cancelBtn: { backgroundColor: '#F1F5F9' },
    cancelBtnText: { color: Colors.navy, fontWeight: '700' },
    confirmBtn: { backgroundColor: Colors.navy },
    confirmBtnText: { color: '#fff', fontWeight: '700' },
    disabledBtn: { opacity: 0.5 }
});
