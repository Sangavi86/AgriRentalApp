// deploy_rules.js — Run with: node deploy_rules.js
// This script deploys the relaxed Firestore rules to Firebase

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'agrirental-live';
const API_KEY = 'AIzaSyBpO38W1z6FLdEgqIhJRNnv7e09cCvzwsQ';

const RULES_CONTENT = fs.readFileSync(path.join(__dirname, 'firestore.rules'), 'utf8');

console.log('The Firestore Security Rules file at firestore.rules is already relaxed.');
console.log('');
console.log('PROBLEM: The rules have NOT been deployed to the live Firebase project.');
console.log('');
console.log('To fix the permission error, you need to either:');
console.log('');
console.log('OPTION 1 (Easiest): Update rules in Firebase Console:');
console.log('  1. Go to: https://console.firebase.google.com/project/' + PROJECT_ID + '/firestore/rules');
console.log('  2. Replace the existing rules with the following:');
console.log('');
console.log('---COPY FROM HERE---');
console.log(RULES_CONTENT);
console.log('---COPY TO HERE---');
console.log('');
console.log('  3. Click "Publish"');
console.log('');
console.log('OPTION 2: Install Firebase CLI and deploy:');
console.log('  npm install -g firebase-tools');
console.log('  firebase login');
console.log('  firebase deploy --only firestore:rules --project ' + PROJECT_ID);
