# Why Home is Empty - Quick Fix Guide

## Problem
The FarmerHomeScreen shows "No machines available" because machines in the database must have `status: 'approved'` to be visible to farmers.

---

## Solution 1: Load Test Machines from the App (Easiest) ✅

1. **Open the app** and navigate to the home screen
2. **Click the orange button**: "🔧 Load Test Machines (Dev)"
3. **Wait for confirmation** alert
4. **Machines appear automatically!** (6 test machines across all categories)

This adds pre-approved machines in Tiruppur district with realistic details and pricing.

---

## Solution 2: Run Node Script (Backend)

If you prefer command-line:

```bash
node load_test_machines.js
```

This creates the same 6 approved test machines in Firestore.

**Required:**
- `.env` file with Firebase credentials configured
- Node.js installed

---

## Solution 3: Manual Admin Approval

1. **As an admin**, go to Admin Dashboard → Machines
2. **Review pending machines** (if any exist)
3. **Click "Approve"** on any machine
4. **Farmers will see it immediately** on home screen

---

## Data Added by Test Machines Script

| # | Name | Type | Hourly | Daily | Owner |
|---|------|------|--------|-------|-------|
| 1 | John Deere 6100M | Tractor | ₹50 | ₹350 | Farmer Raj |
| 2 | Agro Boom 45L | Sprayer | ₹30 | ₹180 | Farmer Suresh |
| 3 | Heavy Duty Trolley | Trolley | ₹20 | ₹120 | Farmer Arjun |
| 4 | DJI Agras T30 | Drone | ₹100 | ₹600 | Farmer Priya |
| 5 | Combine Harvester | Harvester | ₹80 | ₹500 | Farmer Ravi |
| 6 | CAT Wheel Loader | Loader | ₹70 | ₹450 | Farmer Dev |

All machines are set to:
- ✅ Approved status
- ✅ Available (can be booked)
- ✅ Location: Tiruppur district
- ✅ With realistic specs and descriptions

---

## Browser Console Helpers (Dev Mode)

Open browser DevTools (F12) and run:

```javascript
// Import the helpers
import { addTestMachines, debugMachines, debugFarmers } from './src/frontend/utils/devHelpers.js'

// Add test machines
await addTestMachines()

// See all machines in database (approved + pending)
await debugMachines()

// See all farmer users
await debugFarmers()
```

---

## Firestore Structure Required

Machines collection expects:
```json
{
  "id": "auto-generated",
  "name": "Machine Name",
  "type": "Tractor|Sprayer|Trolley|Drone|Harvester|Loader",
  "status": "approved|pending",  // Must be "approved" to show
  "location": {
    "lat": 11.3889,
    "lng": 76.6347,
    "district": "Tiruppur"
  },
  "pricePerDay": 350,
  "pricePerHour": 50,
  "isAvailable": true
}
```

---

## Troubleshooting

### Still seeing empty home?
1. ✅ Refresh the page after adding machines
2. ✅ Check browser console for errors
3. ✅ Verify Firestore rules allow reads
4. ✅ Check Firebase connection is active

### Machines exist but not showing?
1. Check machine `status` field - must be `"approved"`
2. Check Firestore security rules
3. Run `debugMachines()` in console to verify data

### Can't click test button?
1. Make sure you're on FarmerHomeScreen
2. Scroll down to "No machines" message
3. Orange "Load Test Machines" button should be visible

---

**Updated:** April 12, 2026  
**Status:** ✅ Ready to test
