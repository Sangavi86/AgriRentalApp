# Start Here — Onboarding for Contributors

Hi! This file explains what has been done so far, how to run the project locally, how to set up payments for development (Spark plan), and what still needs to be completed.

---

## 1) Project Snapshot (What We Finished)

- **Project**: AgriRentalApp (React Native / Web-capable)
- **Firebase Project**: `agrirental-live` (configured in `src/services/RealFirebase.js`)

### Key Code Changes Made (Recent Work)

- **`src/screens/MachineDetailScreen.jsx`** — Booking flow refactored so **booking is created only AFTER payment succeeds**. No longer depends on Cloud Functions.
- **`src/services/RazorpayService.js`** — New service for client-side Razorpay integration (Spark-plan friendly). Contains `createRazorpayOrder()`, `openRazorpayCheckout()`, and verification notes.
- **`functions/index.js`** — Updated with CORS-enabled HTTP endpoint and improved callable functions. ⚠️ **Not deployed** (project needs Blaze plan for Artifact Registry).
- **`src/utils/dateFormatting.js`** — New utilities for formatting booking start/end times and durations (e.g., "28 Feb 4:00 PM to 9:00 PM").
- **`src/screens/FarmerBookingsScreen.jsx`** — Updated to display readable booking dates/durations.
- **`src/screens/AdminBookingsScreen.jsx`** — Updated to display readable booking dates/durations.
- **`App.jsx`** — Loads Razorpay SDK script at startup (for web/testing).

### Files Added/Updated (Quick List)

**Added:**
- `src/services/RazorpayService.js`
- `src/utils/dateFormatting.js`
- `PAYMENT_SETUP.md`
- `START_HERE.md` (this file)

**Updated:**
- `src/screens/MachineDetailScreen.jsx`
- `src/screens/FarmerBookingsScreen.jsx`
- `src/screens/AdminBookingsScreen.jsx`
- `App.jsx`
- `functions/index.js`

---

## 2) Current App Behavior (What Works Now)

✅ Run the app locally and walk the entire booking flow  
✅ Payment flow works without deploying Cloud Functions (Spark-plan friendly)  
✅ Bookings only written to Firestore after successful payment (prevents stale pending bookings)  
✅ Dates and durations display in human-readable format in all booking screens  

---

## 3) Developer Setup (Before Running Locally)

### Step 1: Clone and Install

```bash
git clone <repo-url>
cd AgriRentalApp
npm install
```

### Step 2: Firebase Configuration (Optional)

The app uses the config in `src/services/RealFirebase.js`. If you need a different Firebase project, update that file:

```javascript
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    // etc.
};
```

### Step 3: Razorpay Configuration (Required for Testing)

Open `src/services/RazorpayService.js` and update:

```javascript
const RAZORPAY_KEY_ID = 'YOUR_RAZORPAY_KEY_ID'; // Replace with your Key ID
```

Get your Key ID from [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → API Keys.

### Step 4: Start the App

**For web (React Native Web or Expo Web):**
```bash
npm start
```

**Or if using Expo directly:**
```bash
npx expo start --web
```

**For native devices (Expo):**
```bash
npx expo start
```

### Step 5: Quick Flow Test

1. Login with any phone number
2. Select role = **Farmer**
3. View approved machines
4. Click a machine → Enter rental duration (hours)
5. Tap **"Book Now"**
6. Simulate payment success
7. ✅ Booking created and stored in Firestore with `paymentStatus: 'paid'`

---

## 4) Payment Setup & Testing (Developer Guide)

### How Payment Works (Current Setup)

This project uses a **Spark-plan friendly** approach (no backend functions required for development):

1. User enters booking details → Taps "Book Now"
2. `createRazorpayOrder()` generates a local order ID
3. Razorpay checkout modal opens (if SDK loaded + Key ID set)
4. User simulates or completes payment
5. On success → Booking created in Firestore with `paymentStatus: 'paid'`

### To Test with Real Razorpay Keys

1. Get Razorpay Test/Live keys: https://dashboard.razorpay.com → Settings → API Keys
2. Update `RAZORPAY_KEY_ID` in `src/services/RazorpayService.js`
3. SDK injection in `App.jsx` handles loading `https://checkout.razorpay.com/v1/checkout.js`
4. Use Razorpay test cards:
   - **Success**: `4111111111111111`
   - **Failure**: `4040404040404040`

### Database After Successful Payment

```javascript
{
  id: "booking_123",
  status: "pending",              // Awaiting driver acceptance
  paymentStatus: "paid",          // ✅ Payment confirmed
  razorpayOrderId: "order_...",
  razorpayPaymentId: "pay_...",
  totalAmount: 800,
  startDate: "2026-02-28T16:00:00Z",
  endDate: "2026-02-28T21:00:00Z",
  duration: 5                     // hours
}
```

### ⚠️ Security Notes (Read Before Production)

- **Never store the Razorpay secret key in frontend code.** Currently, only the public Key ID is stored.
- **For production**, you MUST:
  - Create orders on a secure backend
  - Verify payment signatures on the backend
  - Store keys in Cloud Secret Manager or environment variables
  - Implement webhooks for async payment events

---

## 5) Deployment Note (Why Cloud Functions Were Not Deployed)

### What Happened

Attempted `firebase deploy --only functions` but deployment failed:

```
Error: Your project agrirental-live must be on the Blaze (pay-as-you-go) plan
to complete this command. Required API artifactregistry.googleapis.com can't be
enabled until the upgrade is complete.
```

### What This Means

- Firebase Spark plan doesn't support Cloud Functions
- Upgrade to Blaze plan (pay-as-you-go) if you want Cloud Functions
- Current approach (client-side with `RazorpayService.js`) works fine for development

### Option A: Continue with Current Approach (Recommended for now)

Keep using client-side payment setup. ✅ Works on Spark plan, ✅ No deployment needed.

### Option B: Upgrade to Blaze and Deploy Functions

If upgrading:

```bash
# Go to Firebase Console → agrirental-live → Upgrade to Blaze
cd functions
firebase use agrirental-live
firebase deploy --only functions
```

Then switch `MachineDetailScreen.jsx` to use `httpsCallable` instead of `RazorpayService`.

---

## 6) What Still Needs to Be Done (Next Tasks)

### High Priority (Before Production)

1. **Implement secure backend for order creation**
   - Move `createRazorpayOrder()` to a backend (Node.js, Cloud Function, or other)
   - Return real Razorpay order ID to frontend

2. **Server-side payment verification**
   - Verify Razorpay signature on backend
   - Update Firestore booking status only after verification succeeds

3. **Add payment webhooks**
   - Handle failed payments, refunds, and async events
   - Reconcile payment status with booking status

4. **Secure key storage**
   - Store Razorpay secret key in Cloud Secret Manager or `.env`
   - Never commit to Git

### Medium Priority

5. **Native mobile checkout** (if targeting mobile)
   - Replace current alert-based checkout with `react-native-razorpay`

6. **Fix UI deprecation warnings**
   - Remove deprecated style props (`shadow*`, `textShadow*`, `pointerEvents`)
   - Tidy up browser console

7. **Add tests**
   - Unit tests for booking & payment flows
   - Integration tests for Firestore operations

8. **Documentation**
   - Add `CONTRIBUTING.md`
   - Add `.env.example` with required variables

---

## 7) Git Workflow for Contributors

### Before Pushing

1. Pull latest changes
2. Test locally (follow Step 5 above)
3. Verify Razorpay Key ID setup works

### Commit and Push

```bash
git checkout -b feature/payment-setup
git add .
git commit -m "Add client-side payment flow with Razorpay + date formatting"
git push origin feature/payment-setup
```

### PR Description Template

```
## Changes
- Implemented client-side Razorpay payment flow
- Added date/duration formatting utilities
- Updated booking screens with readable dates
- Added RazorpayService for Spark-plan compatibility

## How to Test
1. Clone and `npm install`
2. Update `RAZORPAY_KEY_ID` in `src/services/RazorpayService.js`
3. Run `npm start`
4. Login → Select Farmer → Book machine → Simulate payment

## Security
- Razorpay secret key not stored frontend ✅
- Production still needs backend verification (TODO)
```

---

## 8) Troubleshooting Checklist

| Issue | Solution |
|-------|----------|
| "Razorpay SDK not loaded" | Check browser console for script error. Verify `App.jsx` runs useEffect. |
| Payment modal not opening | Ensure `RAZORPAY_KEY_ID` is not the placeholder. Check browser network tab. |
| Bookings created but payment wrong | Review `simulatePaymentSuccess()` in `MachineDetailScreen.jsx`. Verify Firestore rules allow write. |
| Firebase auth errors | Check `src/services/RealFirebase.js` config matches your project. |
| CORS errors on payment | Not applicable — we're using client-side SDK, not HTTP requests. |

---

## 9) Next Steps for Your Friend

1. **Clone and set up** (Step 3 above)
2. **Get a Razorpay Key ID** (https://dashboard.razorpay.com)
3. **Update `RAZORPAY_KEY_ID`** in `src/services/RazorpayService.js`
4. **Run locally and test** (Step 5)
5. **Review files** changed (list in Section 1)
6. **Read remaining TODOs** (Section 6)
7. **Push to GitHub** (Section 7)

---

## 10) Optional: Backend Stub (Ready Soon)

I can prepare:

- A simple **Node.js/Express backend** to create Razorpay orders and verify signatures (ready-to-deploy)
- A **Cloud Function** with instructions for Blaze upgrade

Let me know which your friend prefers! 

---

Thank you for using this onboarding file. It's the **single source of truth** for what's done and what's next. Feel free to ask for clarifications or extensions!
