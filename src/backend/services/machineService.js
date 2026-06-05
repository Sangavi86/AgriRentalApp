import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db, ensureAuth } from '../firebase/config';

// Maintains machine-related operations in Firestore
const machinesRef = collection(db, 'machines');

export const machineService = {
  async getAllApproved() {
    await ensureAuth();
    const q = query(machinesRef, where('status', '==', 'approved'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getById(id) {
    await ensureAuth();
    const docRef = doc(db, 'machines', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async add(machine, ownerId, ownerName = '') {
    await ensureAuth();
    await addDoc(machinesRef, {
      ...machine,
      ownerId,
      ownerName,
      isAvailable: true,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  },

  async update(machineId, updates) {
    await ensureAuth();
    const machineRef = doc(db, 'machines', machineId);
    await updateDoc(machineRef, updates);
  },

  // real-time listener for a farmer's machines
  subscribeByOwner(ownerId, callback) {
    const q = query(machinesRef, where('ownerId', '==', ownerId));
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(list);
    });
  },

  // real-time listener for all approved machines
  subscribeAllApproved(callback, errorCallback) {
    const q = query(machinesRef, where('status', '==', 'approved'));
    return onSnapshot(
      q, 
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(list);
      },
      error => {
        console.error('Firestore subscription error:', error);
        if (errorCallback) errorCallback(error);
      }
    );
  },

  async toggleAvailability(machineId, available) {
    const machineRef = doc(db, 'machines', machineId);
    await updateDoc(machineRef, { isAvailable: available });
  }
};

