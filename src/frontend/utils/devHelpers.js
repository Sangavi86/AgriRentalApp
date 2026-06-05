/**
 * Developer Helper: Add Test Machines
 * Usage in browser console: 
 *   1. Import: import { addTestMachines } from './src/frontend/utils/devHelpers.js'
 *   2. Run: await addTestMachines()
 */

import { collection, addDoc, getFirestore } from 'firebase/firestore';
import { db } from '../../backend/firebase/config';

const testMachines = [
  {
    name: 'John Deere 6100M Tractor',
    type: 'Tractor',
    description: 'Powerful 100 HP tractor ideal for plowing and general farming',
    pricePerHour: 50,
    pricePerDay: 350,
    location: {
      lat: 11.3889,
      lng: 76.6347,
      district: 'Tiruppur',
      address: 'Tiruppur, Tamil Nadu',
    },
    ownerName: 'Farmer Raj',
    ownerId: 'system-demo',
    status: 'approved',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Agro Boom 45L Sprayer',
    type: 'Sprayer',
    description: 'Mounted boom sprayer with 45L tank capacity',
    pricePerHour: 30,
    pricePerDay: 180,
    location: {
      lat: 11.3900,
      lng: 76.6360,
      district: 'Tiruppur',
      address: 'Coimbatore Road, Tiruppur',
    },
    ownerName: 'Farmer Suresh',
    ownerId: 'system-demo',
    status: 'approved',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Heavy Duty Farm Trolley',
    type: 'Trolley',
    description: 'Two-wheel heavy duty trolley for transporting crops',
    pricePerHour: 20,
    pricePerDay: 120,
    location: {
      lat: 11.3880,
      lng: 76.6335,
      district: 'Tiruppur',
      address: 'Kankeyam, Tiruppur',
    },
    ownerName: 'Farmer Arjun',
    ownerId: 'system-demo',
    status: 'approved',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'DJI Agras T30 Drone',
    type: 'Drone',
    description: 'Professional drone for crop spraying with 30L capacity',
    pricePerHour: 100,
    pricePerDay: 600,
    location: {
      lat: 11.3920,
      lng: 76.6370,
      district: 'Tiruppur',
      address: 'NH44, Tiruppur',
    },
    ownerName: 'Farmer Priya',
    ownerId: 'system-demo',
    status: 'approved',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Combine Harvester',
    type: 'Harvester',
    description: 'Advanced combine harvester with grain tank',
    pricePerHour: 80,
    pricePerDay: 500,
    location: {
      lat: 11.3870,
      lng: 76.6325,
      district: 'Tiruppur',
      address: 'Pongalur Road, Tiruppur',
    },
    ownerName: 'Farmer Ravi',
    ownerId: 'system-demo',
    status: 'approved',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    name: 'CAT Wheel Loader',
    type: 'Loader',
    description: 'Heavy duty wheel loader for material handling',
    pricePerHour: 70,
    pricePerDay: 450,
    location: {
      lat: 11.3910,
      lng: 76.6355,
      district: 'Tiruppur',
      address: 'Railway Junction, Tiruppur',
    },
    ownerName: 'Farmer Dev',
    ownerId: 'system-demo',
    status: 'approved',
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
];

export async function addTestMachines() {
  try {
    const machinesRef = collection(db, 'machines');
    let added = 0;

    for (const machine of testMachines) {
      await addDoc(machinesRef, machine);
      added++;
      console.log(`✅ Added: ${machine.name}`);
    }

    console.log(`\n✅ Successfully added ${added} test machines!`);
    console.log('Refresh the page to see them on FarmerHomeScreen');
    return { success: true, count: added };
  } catch (error) {
    console.error('❌ Error adding test machines:', error);
    return { success: false, error: error.message };
  }
}

export async function debugFarmers() {
  try {
    const { getDocs } = await import('firebase/firestore');
    const farmersRef = collection(db, 'users');
    const snap = await getDocs(farmersRef);
    console.log('📋 Farmers in database:');
    snap.docs.forEach(doc => {
      console.log(`  - ${doc.data().displayName}: ${doc.id}`);
    });
  } catch (error) {
    console.error('❌ Error fetching farmers:', error);
  }
}

export async function debugMachines() {
  try {
    const { getDocs, query, where } = await import('firebase/firestore');
    const machinesRef = collection(db, 'machines');
    const snap = await getDocs(machinesRef);
    
    console.log(`📋 Total Machines: ${snap.docs.length}`);
    const approved = snap.docs.filter(d => d.data().status === 'approved');
    console.log(`  ✅ Approved: ${approved.length}`);
    console.log(`  ⏳ Pending: ${snap.docs.length - approved.length}`);
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name} (${data.type}) - Status: ${data.status}`);
    });
  } catch (error) {
    console.error('❌ Error fetching machines:', error);
  }
}
