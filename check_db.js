import { db } from './src/backend/firebase/config.js';
import { collection, getDocs } from 'firebase/firestore';

const checkUsers = async () => {
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  console.log('Total users:', snap.size);
  snap.forEach(d => {
    console.log('User ID:', d.id);
    console.log('Data:', JSON.stringify(d.data(), null, 2));
  });
  process.exit(0);
};

checkUsers();
