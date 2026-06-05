# Firebase Cloud Functions Guide (Razorpay Integration)

To enable live payments, you need to set up Firebase Cloud Functions to handle order creation and signature verification securely.

## 1. Initialize Functions
Run in your project root:
```bash
firebase init functions
```

## 2. Install Dependencies
```bash
cd functions
npm install razorpay crypto
```

## 3. Implementation Code (index.js)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');
const crypto = require('crypto');

admin.initializeApp();

const razorpay = new Razorpay({
  key_id: 'YOUR_RAZORPAY_KEY_ID',
  key_secret: 'YOUR_RAZORPAY_KEY_SECRET'
});

// CREATE ORDER
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  
  const options = {
    amount: data.amount * 100, // Amount in paise
    currency: "INR",
    receipt: `receipt_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// VERIFY PAYMENT
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  const { orderId, paymentId, signature, bookingId } = data;
  
  const text = orderId + "|" + paymentId;
  const generated_signature = crypto
    .createHmac("sha256", "YOUR_RAZORPAY_KEY_SECRET")
    .update(text)
    .digest("hex");

  if (generated_signature === signature) {
    await admin.firestore().collection('bookings').doc(bookingId).update({
      paymentStatus: 'paid',
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId
    });
    return { status: 'success' };
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Signature verification failed');
  }
});
```

## 4. Deploy
```bash
firebase deploy --only functions
```
