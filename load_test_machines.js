/**
 * Load Test Machines into Firestore with 'approved' status
 * Run with: node load_test_machines.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const testMachines = [
  {
    name: 'John Deere 6100M Tractor',
    type: 'Tractor',
    description: 'Powerful 100 HP tractor ideal for plowing and general farming',
    category: 'Heavy Equipment',
    pricePerHour: 50,
    pricePerDay: 350,
    location: {
      lat: 11.3889,
      lng: 76.6347,
      district: 'Tiruppur',
      address: 'Tiruppur, Tamil Nadu',
    },
    ownerName: 'Farmer Raj',
    ownerId: 'demo-farmer-1',
    status: 'approved',
    isAvailable: true,
    images: ['https://via.placeholder.com/300?text=Tractor'],
    specs: {
      horsePower: 100,
      wheelType: '4WD',
      yearOfManufacture: 2018,
    },
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Agro Boom 45L Sprayer',
    type: 'Sprayer',
    description: 'Mounted boom sprayer with 45L tank capacity for pesticide application',
    category: 'Spraying Equipment',
    pricePerHour: 30,
    pricePerDay: 180,
    location: {
      lat: 11.3900,
      lng: 76.6360,
      district: 'Tiruppur',
      address: 'Coimbatore Road, Tiruppur',
    },
    ownerName: 'Farmer Raj',
    ownerId: 'demo-farmer-1',
    status: 'approved',
    isAvailable: true,
    images: ['https://via.placeholder.com/300?text=Sprayer'],
    specs: {
      tankCapacity: 45,
      sprayWidth: 12,
      yearOfManufacture: 2020,
    },
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Heavy Duty Farm Trolley',
    type: 'Trolley',
    description: 'Two-wheel heavy duty trolley for transporting crops and materials',
    category: 'Transport',
    pricePerHour: 20,
    pricePerDay: 120,
    location: {
      lat: 11.3880,
      lng: 76.6335,
      district: 'Tiruppur',
      address: 'Kankeyam, Tiruppur',
    },
    ownerName: 'Farmer Suresh',
    ownerId: 'demo-farmer-2',
    status: 'approved',
    isAvailable: true,
    images: ['https://via.placeholder.com/300?text=Trolley'],
    specs: {
      capacity: 3,
      wheelSize: 24,
      yearOfManufacture: 2019,
    },
    createdAt: new Date().toISOString(),
  },
  {
    name: 'DJI Agras T30 Agricultural Drone',
    type: 'Drone',
    description: 'Professional drone for crop spraying and monitoring with 30L capacity',
    category: 'Precision Agriculture',
    pricePerHour: 100,
    pricePerDay: 600,
    location: {
      lat: 11.3920,
      lng: 76.6370,
      district: 'Tiruppur',
      address: 'NH44, Tiruppur',
    },
    ownerName: 'Farmer Arjun',
    ownerId: 'demo-farmer-3',
    status: 'approved',
    isAvailable: true,
    images: ['https://via.placeholder.com/300?text=Drone'],
    specs: {
      capacity: 30,
      flightTime: 12,
      yearOfManufacture: 2021,
    },
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Case IH Axial-Flow Combine Harvester',
    type: 'Harvester',
    description: 'Advanced combine harvester with grain tank for efficient crop harvesting',
    category: 'Harvesting Equipment',
    pricePerHour: 80,
    pricePerDay: 500,
    location: {
      lat: 11.3870,
      lng: 76.6325,
      district: 'Tiruppur',
      address: 'Pongalur Road, Tiruppur',
    },
    ownerName: 'Farmer Priya',
    ownerId: 'demo-farmer-4',
    status: 'approved',
    isAvailable: true,
    images: ['https://via.placeholder.com/300?text=Harvester'],
    specs: {
      grainTankCapacity: 4000,
      cutterBarWidth: 7,
      yearOfManufacture: 2019,
    },
    createdAt: new Date().toISOString(),
  },
  {
    name: 'Caterpillar 950G Front End Loader',
    type: 'Loader',
    description: 'Heavy duty wheel loader for material handling and farm operations',
    category: 'Material Handling',
    pricePerHour: 70,
    pricePerDay: 450,
    location: {
      lat: 11.3910,
      lng: 76.6355,
      district: 'Tiruppur',
      address: 'Railway Junction, Tiruppur',
    },
    ownerName: 'Farmer Ravi',
    ownerId: 'demo-farmer-5',
    status: 'approved',
    isAvailable: true,
    images: ['https://via.placeholder.com/300?text=Loader'],
    specs: {
      bucketCapacity: 4.4,
      operatingWeight: 18000,
      yearOfManufacture: 2017,
    },
    createdAt: new Date().toISOString(),
  },
];

async function loadTestMachines() {
  try {
    console.log('Loading test machines into Firestore...');
    const machinesRef = collection(db, 'machines');

    for (const machine of testMachines) {
      const docRef = await addDoc(machinesRef, machine);
      console.log(`✅ Added: ${machine.name} (ID: ${docRef.id})`);
    }

    console.log(`\n✅ Successfully loaded ${testMachines.length} test machines!`);
    console.log('\nMachines are now visible on the FarmerHomeScreen with status: approved');
  } catch (error) {
    console.error('❌ Error loading test machines:', error);
  }

  process.exit(0);
}

loadTestMachines();
