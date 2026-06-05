# AgriRental App - Comprehensive Manual Testing Guide

**Version**: 1.0  
**Last Updated**: February 26, 2026  
**Status**: Ready for Phase 1-7 Implementation Testing

---

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Phase 1: Firestore Database Restructuring](#phase-1-testing)
3. [Phase 2: Admin Role Implementation](#phase-2-testing)
4. [Phase 3: Admin Panel Functionality](#phase-3-testing)
5. [Phase 4: Real Booking Flow](#phase-4-testing)
6. [Phase 5: Razorpay Payment Integration](#phase-5-testing)
7. [Phase 6: Video Storage](#phase-6-testing)
8. [Phase 7: Mock Logic Removal](#phase-7-testing)
9. [Critical Test Cases](#critical-test-cases)
10. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### Prerequisites
- Node.js v16+ installed
- Expo CLI (`npm install -g expo-cli`)
- Firebase project configured with Firestore
- Razorpay account (for payment testing)

### Starting the Development Server

```bash
cd c:\Users\sange\MyProjecct\AgriRentalApp
npm install --legacy-peer-deps
npm start
```

**For Web Testing:**
```bash
npm run web
```

**For Android Emulator:**
```bash
expo start --android
```

---

## PHASE 1 TESTING: Firestore Database Restructuring

### 1.1 Users Collection Validation

#### Test Case 1.1.1: New User Registration
**Step by Step:**
1. Open the app and navigate to Login
2. Enter a new phone number (e.g., `9876543210`)
3. OTP verification screen should appear
4. Enter any OTP code
5. Navigate to Role Selection
6. **Expected**: User created in Firestore with:
   - `phoneNumber`: entered number
   - `role`: null (not yet selected)
   - `isActive`: true
   - `createdAt`: current timestamp

**Verification in Firestore Console:**
- Go to Firebase Console → Firestore → users collection
- Check newly created document has correct fields

#### Test Case 1.1.2: Role Assignment
**Step by Step:**
1. From Role Selection screen, tap "Farmer"
2. **Expected**: User role updated to 'farmer' in Firestore
3. Go to FarmerHomeScreen
4. Logout
5. Login with same number
6. **Expected**: Should show FarmerHomeScreen directly (role remembered)

#### Test Case 1.1.3: Inactive User Blocking
**Step by Step:**
1. In Firebase Console, find the test user document
2. Set `isActive` to false
3. In app, logout and try to login with that number
4. **Expected**: Alert: "This account has been deactivated by the admin."
5. Cannot proceed to next screen

#### Test Case 1.1.4: Admin User Creation
**Step by Step:**
1. Phone number: `9999999999`
2. Complete signup
3. **Expected**: User created with `role: 'admin'`
4. Navigate to AdminDashboardScreen directly
5. Should see admin interface

---

### 1.2 Machines Collection Validation

#### Test Case 1.2.1: New Machine Submission (Pending Status)
**Step by Step:**
1. Login as Farmer
2. Navigate to "Add Machine"
3. Fill details:
   - Name: "Mahindra 575 DI"
   - Type: "Tractor"
   - Rate: "800"
   - Description: "Well-maintained 50HP tractor with 4WD"
   - Image URL: (valid image link)
4. Tap "Submit"
5. **Expected**: Machine created in Firestore with `status: "pending"`

**Verification:**
- Machine NOT visible in FarmerHomeScreen (only approved machines shown)
- Admin can see it in AdminMachinesScreen with "PENDING" badge

#### Test Case 1.2.2: Machine Approval
**Step by Step:**
1. Login as admin (phone: 9999999999)

---

#### Test Case 1.2.3: Edit Machine Details (Admin)
**Step by Step:**
1. From AdminMachines screen tap the ✎ icon on a machine card.
2. The Add Machine form appears populated with existing values.
3. Change the rate, description or location and tap Save.
4. **Expected**: Firestore document is updated and changes shown in the list.

#### Test Case 1.2.4: Edit / Toggle Availability (Owner)
**Step by Step:**
1. Login as the farmer who owns a machine.
2. Open "My Rentals" and scroll to the "My Machines" section.
3. Tap a machine name to open the edit form or use the toggle switch to mark available/unavailable.
4. **Expected**: Changes persist (price, description, location, availability) and reflect on FarmHome when returned.

---

#### Test Case 1.2.5: Location Fallback in Card
1. In Firestore manually create a machine document without a location field.
2. Open FarmerHomeScreen.
3. **Expected**: Card shows "Location not set" instead of blank space.

---

#### Test Case 1.2.6: Driver Job Acceptance
1. Login as a driver (role set via SignUp).
2. Ensure there is at least one booking with `needDriver=true` and no driverId.
3. Accept a job from the available tab.
4. **Expected**: Booking immediately disappears from the available list and moves to "My Jobs".
   - No other driver should continue to see the same booking.
   - The acceptance alert should appear and the button should show a spinner while in-flight.


2. Navigate to AdminMachinesScreen
3. Find the pending machine
4. Tap "✓" (Approve button)
5. **Expected**: 
   - Firestore: `status` changed to "approved"
   - FarmerHomeScreen now shows the machine
   - Success alert shown

#### Test Case 1.2.3: Machine Rejection
**Step by Step:**
1. Add another machine as farmer
2. Login as admin
3. In AdminMachinesScreen, tap "✕" (Reject)
4. **Expected**: 
   - Firestore: `status` changed to "rejected"
   - Does NOT appear in FarmerHomeScreen
   - Does NOT appear in DriverHomeScreen

---

### 1.3 Bookings Collection Validation

#### Test Case 1.3.1: New Booking Creation
**Step by Step:**
1. Login as Farmer
2. Browse approved machines
3. Tap on a machine card
4. In MachineDetailScreen:
   - Select duration: 5 hours
   - Optional: Toggle "Expert Driver"
   - Tap "Book Now"
5. **Expected**: 
   - Firestore booking created with:
     - `status: "pending"`
     - `paymentStatus: "unpaid"`
     - `farmerId`: farmer's uid
     - `machineId`: machine id
     - `totalAmount`: calculated correctly (rate × hours + driver fee if selected)

#### Test Case 1.3.2: Booking Status to Confirmed after Payment
**Step by Step:**
1. From previous test, payment dialog appears
2. Tap "Simulate Payment"
3. VideoHandshakeScreen appears
4. Tap "Upload & Confirm"
5. **Expected**:
   - Booking updated to `status: "confirmed"`, `paymentStatus: "paid"`
   - FarmerHome screen shown
   - Booking appears in FarmerBookingsScreen

---

## PHASE 2 TESTING: Admin Role Implementation

### 2.1 Navigation Logic
**Test Case 2.1.1: Admin vs User Navigation**
1. Login with admin (9999999999)
2. **Expected**: AdminDashboardScreen appears (not FarmerHomeScreen)
3. Can only see Admin screens:
   - AdminDashboardScreen
   - AdminUsersScreen
   - AdminMachinesScreen
   - AdminBookingsScreen
   - AdminPaymentsScreen
4. Logout
5. Login as farmer
6. **Expected**: FarmerHomeScreen appears, admin screens not accessible

---

## PHASE 3 TESTING: Admin Panel Functionality

### 3.1 AdminDashboardScreen

#### Test Case 3.1.1: Real-time Statistics
**Step by Step:**
1. Login as admin
2. Dashboard shows:
   - Total Users: Count of all users in Firestore
   - Active Machines: Count where `status == "approved"`
   - Active Bookings: Count where `status == "confirmed"`
   - Total Revenue: Sum of `totalAmount` where `paymentStatus == "paid"`
3. Swipe down to refresh
4. Statistics update based on current Firestore data
5. **Verification**: 
   - Numbers match Firestore query results
   - Any pending machine alert shows correctly

### 3.2 AdminUsersScreen

#### Test Case 3.2.1: User Listing and Filtering
1. Navigate to AdminUsersScreen
2. See list of all users
3. Each card shows:
   - Phone number
   - Role (farmer/driver/admin)
   - Join date
4. Filter tabs at top: "All", "Farmer", "Driver", "Admin"
5. Click "Farmer" filter
6. **Expected**: Only farmers shown

#### Test Case 3.2.2: User Deactivation
1. Find a farmer user
2. Tap status button (currently shows green ✓)
3. **Expected**: Button changes to red ✕, user `isActive` set to false
4. User cannot login anymore
5. Tap again to reactivate
6. **Expected**: User can login again

#### Test Case 3.2.3: User Deletion
1. Tap 🗑 (trash) icon on a user
2. Confirm in alert dialog
3. **Expected**: User deleted from Firestore, removed from list

### 3.3 AdminMachinesScreen

#### Test Case 3.3.1: Machine Filtering
1. Three machines: 1 pending, 1 approved, 1 rejected
2. Default view shows ALL
3. Click "Pending" filter
4. **Expected**: Only pending machine shown
5. Click "Approved" filter
6. **Expected**: Only approved machine shown

#### Test Case 3.3.2: Machine Status Management
1. Select a pending machine
2. Tap "✓" (Approve button)
3. Machine appears in FarmerHomeScreen immediately
4. Select an approved machine
5. Tap "✕" (Reject)
6. Machine disappears from FarmerHomeScreen

#### Test Case 3.3.3: Machine Deletion
1. Tap 🗑 icon on any machine
2. Confirm deletion
3. **Expected**: Machine removed from Firestore and list

### 3.4 AdminBookingsScreen

#### Test Case 3.4.1: Booking Filtering by Status
1. View bookings with different statuses
2. Filter by: "All", "Pending", "Confirmed", "Completed", "Cancelled"
3. **Expected**: List filters correctly

#### Test Case 3.4.2: Booking Cancellation
1. Find a pending or confirmed booking
2. Tap "Cancel Booking"
3. Confirm in alert
4. **Expected**: 
   - Booking `status` changed to "cancelled"
   - Button disappears
   - Card reflects new status

---

#### Test Case 4.1: Booking Conflict Prevention
1. As farmer, open a machine and attempt to book 2026-03-14, slot 6PM–10PM
2. Submit the booking successfully.
3. Immediately try to book the same machine on the same date/time slot again.
4. **Expected**: Alert pops saying machine already booked; second booking not created.
5. Also try a partially overlapping request (same date but different slot) – should also be rejected due to overlap logic.

#### Test Case 4.2: Maximum Duration Enforcement
1. Open booking modal and enter rental duration >12 hours (e.g. 24).
2. **Expected**: Error alert "Maximum rental duration is 12 hours..." and submission blocked.

#### Test Case 4.3: Refund & Compensation Rules
1. Create a booking for tomorrow at 6PM.
2. Cancel more than 24 hours before start → expect 100% refund message in alert.
3. Cancel between 6–24 hours before → expect 50% refund message.
4. Cancel less than 6 hours before → expect "No refund" message.
5. For a booking where a driver has already accepted, cancel and verify alert also mentions driver compensation (₹200).

#### Test Case 4.4: Payment Breakdown Visible
1. After booking a machine with driver fee, open My Orders and Admin Bookings.
2. Each card should display separate line items for machine amount, driver amount and platform fee.

---

#### Test Case 5.1: Editing Machines (Farmer)
1. Log in as a farmer who owns at least one machine.
2. Go to the "My Listings" screen (or Farmer Home where the pencil overlay appears).
3. Tap the ✎ or the edit icon next to your machine – the Add/Edit form should load with existing data.
4. Change one field (e.g. hourly rate) and save.
5. **Expected**: machine is updated, you see an alert, and the list reflects changes.
6. Also attempt to edit your machine from the farmer home list (pencil overlay) – confirm navigation works.

#### Test Case 5.2: Editing Machines (Admin)
1. Log in as admin and go to the Machines review screen.
2. Click the ✎ edit button on any machine.
3. **Expected**: navigation to the same AddMachine form without warning; you can update and save.

#### Test Case 5.3: Cancel Button on Web
1. Open My Rentals in a browser and locate a pending/confirmed booking.
2. Press the cancel (✕) button. 
3. **Expected**: a native confirm dialog appears; after confirming, booking cancels and you get refund/compensation alert.


---


### 3.5 AdminPaymentsScreen

#### Test Case 3.5.1: Revenue Calculation
1. 3 bookings with `paymentStatus: "paid"` and amounts: ₹5000, ₹3000, ₹2000
2. Header shows: Total Revenue = ₹10000
3. Lists 3 transactions with full details
4. **Expected**: Math is correct, all paid bookings shown

#### Test Case 3.5.2: Payment Details Display
1. Each payment card shows:
   - Machine name
   - Farmer ID (first 8 chars)
   - Driver ID if assigned
   - Razorpay Order ID
   - Transaction date
   - Amount in green

---

## PHASE 4 TESTING: Real Booking Flow

### 4.1 MachineDetailScreen Modifications

#### Test Case 4.1.1: Dynamic Price Calculation
1. Open machine (₹800/hour)
2. Duration input: 5 hours
3. **Expected**: Total = ₹4000
4. Toggle "Expert Driver" (+₹200/hour)
5. **Expected**: Total = ₹5000 (1000/hour × 5 hours)
6. Change duration to 3
7. **Expected**: Total = ₹3600 (1200/hour × 3)

#### Test Case 4.1.2: Full Booking Process
1. Fill all details
2. Tap "Book Now"
3. **Expected**:
   - Booking created with all correct fields
   - Payment dialog appears
   - Razorpay order created

#### Test Case 4.1.3: Post-Payment Flow
1. Complete payment (simulate)
2. VideoHandshakeScreen appears
3. Tap "Upload & Confirm" 
4. **Expected**:
   - Booking status → "confirmed"
   - paymentStatus → "paid"
   - Redirect to FarmerHome
   - Booking appears in FarmerBookingsScreen

---

## PHASE 5 TESTING: Razorpay Payment Integration

### 5.1 Payment Flow

#### Test Case 5.1.1: Order Creation
1. Create a booking
2. Payment initialization happens
3. **Expected**: 
   - Cloud function called with amount
   - Razorpay order ID returned
   - Dialog shows order ID and amount

#### Test Case 5.1.2: Payment Simulation
1. In payment dialog, tap "Simulate Payment"
2. **Expected**: Payment marked as successful
3. Booking updated to `paymentStatus: "paid"`

#### Test Case 5.1.3: Payment Error Handling
1. Try to create booking, try intentionally failing payment
2. **Expected**: Error dialog shown, user can retry

---

## PHASE 6 TESTING: Video Storage Integration

### 6.1 VideoHandshakeScreen

#### Test Case 6.1.1: Farmer Video Upload
1. After payment, VideoHandshakeScreen appears with farmer mode
2. Shows instructions
3. Tap "Upload & Confirm"
4. **Expected**:
   - Booking updated with `videoFarmerUrl`
   - Booking status → "confirmed"
   - FarmerHome shown

#### Test Case 6.1.2: Driver Video Upload
1. Driver accepts a job
2. VideoHandshakeScreen appears with driver mode  
3. Tap "Upload & Accept Job"
4. **Expected**:
   - Booking updated with `videoDriverUrl`
   - Booking status → "confirmed"
   - DriverHome shown

---

## PHASE 7 TESTING: Mock Logic Removal

### 7.1 Real Firestore Queries

#### Test Case 7.1.1: FarmerHomeScreen Shows Only Approved Machines
1. Create 3 machines: 1 rejected, 1 pending, 1 approved
2. Only approved shows in list
3. **Verification**: Query uses `where('status', '==', 'approved')`

#### Test Case 7.1.2: FarmerBookingsScreen - Real Bookings
1. Create multiple bookings as farmer
2. FarmerBookingsScreen shows all created bookings
3. Each booking shows real data from Firestore
4. No static/mock data present

#### Test Case 7.1.3: DriverHomeScreen - Available Jobs
1. Create 3 bookings with different statuses
2. DriverHomeScreen shows only pending bookings
3. Each job card shows real booking data
4. Accept job functionality works

#### Test Case 7.1.4: DriverScheduleScreen - Assigned Jobs
1. Accept a job as driver
2. DriverScheduleScreen shows accepted jobs (where `driverId == driver.uid`)
3. No mock data

---

## CRITICAL TEST CASES

### C1: Authentication Flow with Role Validation
```
✓ New user → null role until selection
✓ Role selection → persistent storage
✓ Admin → cannot be selected from UI (manual only)
✓ Inactive user → login blocked
✓ Correct role → correct screen displayed
```

### C2: Machine Approval Workflow
```
✓ New machine → pending status
✓ Farmer cannot see pending machines
✓ Admin approves → appears everywhere
✓ Admin rejects → never appears publicly
✓ Status update → real-time visibility
```

### C3: Booking Authorization
```
✓ Only farmer can create bookings
✓ Only assigned driver can view booking
✓ Only admin can cancel bookings
✓ Farmer can view own bookings
✓ Driver can view assigned bookings
```

### C4: Payment Security
```
✓ Secret key NOT in frontend code
✓ Razorpay function verified server-side
✓ Booking locked until payment confirmed
✓ Payment status accurate in Firestore
```

### C5: Data Consistency
```
✓ Admin stats match Firestore totals
✓ Role correctly cached in auth context
✓ All queries return real data
✓ No hardcoded mock arrays
```

---

## TROUBLESHOOTING

### Issue: "User cannot login"
**Solution**: 
- Check Firestore security rules deployed
- Verify user `isActive` field is not false
- Check console for auth errors

### Issue: "Admin screens not appearing"
**Solution**:
- Verify phone 9999999999 is in Firestore with `role: 'admin'`
- Check AppNavigator has correct role comparison
- Ensure role is lowercase ('admin', not 'ADMIN')

### Issue: "Machine not showing in FarmerHome"
**Solution**:
- Check machine `status` field is exactly 'approved'
- Verify query is using `where('status', '==', 'approved')`
- Check Firebase security rules allow read

### Issue: "Booking not saved"
**Solution**:
- Verify Firestore has bookings collection
- Check user UID is correctly passed
- Verify security rules allow create

### Issue: "Payment dialog not appearing"
**Solution**:
- Check Firebase Cloud Functions are deployed
- Verify `createRazorpayOrder` function exists
- Check internet connection

### Issue: "Videos not uploading"
**Solution**:
- Verify Firebase Storage rules are open
- Check blob/file creation is working
- Verify storage bucket in Firebase config

---

## Success Criteria

✅ All 7 phases implemented without errors  
✅ Real Firestore data (no mock arrays)  
✅ Admin role cannot be selected from UI  
✅ All status flows working (pending → approved → visible)  
✅ Payments initializing from cloud functions  
✅ Videos uploading to Storage  
✅ Security rules protecting sensitive operations  
✅ All statistics calculating correctly  
✅ Real-time updates reflecting in UI  

---

## Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured (Razorpay keys)
- [ ] Firestore rules deployed  
- [ ] Cloud Functions deployed
- [ ] Storage rules updated
- [ ] Email notifications setup (optional)
- [ ] Error logging configured
- [ ] Performance monitoring enabled
- [ ] Backup Firestore enabled
- [ ] Admin account created (9999999999)
- [ ] Test booking created end-to-end

---

## Support Contact

For issues or questions about testing:
- Check Firestore Console for data
- Review Cloud Functions logs
- Enable Firebase Debug Logging in app

---

**Testing Guide Created**: February 26, 2026  
**Last Updated**: February 26, 2026  
**Status**: Ready for Manual Testing
