# Payment Setup Guide (Spark Plan - No Cloud Functions)

## Overview
**Payments are now simulated internally.**
The original Razorpay integration has been removed; there is no real payment provider used. The flow creates a booking record and randomly marks it as paid/failed to mimic a gateway.
This keeps the app Expo‑compatible and works on the free Spark plan.

## Setting Up Razorpay

### 1. Get Your Razorpay API Keys
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Sign up or login
3. Navigate to **Settings → API Keys**
4. Copy your **Key ID** (public key) - you'll need this

### 2. No service to update

The previous `RazorpayService.js` has been deleted. All payment logic is now handled by the simulated flow in `MachineDetailScreen.jsx` and `bookingService.js`.

There is nothing for you to configure.
### 3. No external SDK required

Since payments are simulated, you do _not_ need to load any external library or SDK. The app will display a fake processing delay and randomly decide success or failure.
## How It Works

### Current Flow (Development/Testing)
1. **Client creates order** → `createRazorpayOrder()` generates a local order ID
2. **Razorpay checkout opens** → User enters payment details
3. **Payment processed** → Razorpay returns payment details
4. **Booking created** → Only after payment succeeds

### Production Recommendation
For production, implement backend order creation:

1. **Client requests order from backend**
   ```javascript
   const response = await fetch('/api/create-order', {
       method: 'POST',
       body: JSON.stringify({ amount: 800 })
   });
   ```

2. **Backend creates order via Razorpay API**
   ```javascript
   const order = await razorpay.orders.create({
       amount: 80000, // in paise
       currency: "INR",
       receipt: "receipt_001"
   });
   ```

3. **Backend returns order ID to client**
4. **Client opens checkout with real order**

## Testing Payment

### Simulated Payment Mode (Current Setup)
- When a booking is created the app waits 2 seconds and then randomly marks the booking `paymentStatus` as **Paid** (90%) or **Failed** (10%).
- Use this to demonstrate the full flow in demos without charging any card.

> ⚠️ There is no real payment provider; do not expect actual transactions.

### Removing the old Razorpay instructions
All previous notes about Razorpay keys/cards can be ignored; they are retained in documentation only for history.
## Payment Status in Database

After successful payment:
- Booking status: **pending** (waiting for driver acceptance)
- Payment status: **paid** ✓
- razorpayOrderId and razorpayPaymentId stored

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Razorpay SDK not loaded" | Add script tag to index.html or load in App.jsx |
| Payment doesn't open | Check RAZORPAY_KEY_ID is set correctly |
| Booking appears but payment failed | Check API is properly handling failed payments |
| CORS errors | Not applicable - client-side only |

## Security Notes

⚠️ **Important for Production**:
- Never store secret key in frontend code
- Always verify payments on backend
- Implement webhook for payment confirmation
- Use backend to create orders (not client-side)

For now, this setup works for development and testing on Spark plan!
