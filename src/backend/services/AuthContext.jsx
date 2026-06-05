import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { RealAuth } from './RealFirebase';
import { driverService } from './driverService';
import { mockGpsService } from './mockGpsService';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userRef = doc(db, 'users', firebaseUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        
                        // Admin hardcode test logic fallback
                        if (firebaseUser.phoneNumber === '+919999999999' && userData.role !== 'admin') {
                            await updateDoc(userRef, { role: 'admin' });
                            userData.role = 'admin';
                        }
                        
                        const finalUser = { ...firebaseUser, ...userData };
                        setUser(finalUser);
                        mockGpsService.initForUser(finalUser.uid);
                    } else {
                        // User is authenticated in Firebase (maybe anonymous) but has no doc in 'users'
                        // Treat them as logged out of the app.
                        setUser(null);
                        mockGpsService.stopAll();
                    }
                } catch (e) {
                    console.error("Error fetching user data on auth persistence:", e);
                    setUser(null);
                    mockGpsService.stopAll();
                }
            } else {
                setUser(null);
                mockGpsService.stopAll();
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (phone) => {
        setIsLoading(true);
        try {
            // USE REAL AUTH
            const loggedUser = await RealAuth.loginWithPhone(phone);
            setUser(loggedUser);
            return loggedUser;
        } catch (error) {
            console.error(error);
            alert(error.message || 'Login failed. Check internet?');
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const setRole = async (role, registerData = null, explicitUser = null) => {
        const targetUser = explicitUser || user;
        if (!targetUser) return;
        setIsLoading(true);
        try {
            // Trim early for data integrity
            const cleanName = (registerData?.name || targetUser.displayName || 'User').trim();
            const cleanDistrict = (registerData?.district || 'General').trim();
            const cleanState = (registerData?.state || 'General').trim();
            const cleanPhone = (registerData?.phone || targetUser.phoneNumber || '').trim();
            const cleanSpeciality = (registerData?.speciality || '').trim();

            // 1. DUAL WRITE Logic: If it's a driver, we register them in the drivers collection first
            if (role === 'driver') {
                await driverService.register({
                    userId: targetUser.uid,
                    name: cleanName,
                    phone: cleanPhone,
                    district: cleanDistrict,
                    state: cleanState,
                    speciality: cleanSpeciality,
                    capabilities: registerData?.capabilities || []
                });
            }

            // 2. MAIN USER WRITE: Update role and metadata in main users collection
            const updates = { 
                role,
                name: cleanName,
                district: cleanDistrict,
                state: cleanState,
                // Ensure speciality is also on the user object for quick access
                ...(role === 'driver' && { speciality: cleanSpeciality })
            };
            
            await RealAuth.updateRole(targetUser.uid, role, updates);
            setUser({ ...targetUser, ...updates });
        } catch (e) {
            console.error(e);
            alert("Failed to update role: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await auth.signOut();
            setUser(null);
            mockGpsService.stopAll();
        } catch (e) {
            console.error("Logout failed:", e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, setRole, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
