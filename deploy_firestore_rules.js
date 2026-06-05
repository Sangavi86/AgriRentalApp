/**
 * deploy_firestore_rules.js
 * Run with: node deploy_firestore_rules.js YOUR_OAUTH_TOKEN
 * 
 * Get OAuth token by running: firebase login --reauth, then firebase auth:token
 * 
 * OR simply paste the rules manually in Firebase Console:
 * https://console.firebase.google.com/project/agrirental-live/firestore/rules
 */

const https = require('https');
const fs = require('fs');

const PROJECT_ID = 'agrirental-live';
const TOKEN = process.argv[2]; // Pass your OAuth token as argument

const RULES_BODY = {
    source: {
        files: [
            {
                content: fs.readFileSync('./firestore.rules', 'utf8'),
                name: 'firestore.rules'
            }
        ]
    }
};

if (!TOKEN) {
    console.error('Error: No OAuth token provided.');
    console.error('Usage: node deploy_firestore_rules.js YOUR_OAUTH_TOKEN');
    process.exit(1);
}

const body = JSON.stringify(RULES_BODY);
const options = {
    hostname: 'firebaserules.googleapis.com',
    path: `/v1/projects/${PROJECT_ID}/releases`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Response:', res.statusCode);
        console.log(data);
    });
});

req.on('error', (e) => console.error('Error:', e));
req.end();
