const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Initialize Razorpay with fallback values
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET'
});

// CREATE ORDER - Callable Function (for Firebase SDK usage)
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { amount } = data;
    if (!amount || amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid amount is required');
    }

    const options = {
        amount: Math.round(amount * 100), // Amount in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}_${context.auth.uid}`
    };

    try {
        const order = await razorpay.orders.create(options);
        console.log('Razorpay order created:', order.id);
        return {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt
        };
    } catch (error) {
        console.error('Razorpay error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to create payment order: ' + error.message
        );
    }
});

// CREATE ORDER - HTTP Function with CORS (alternative endpoint)
exports.createRazorpayOrderHttp = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(400).json({ error: 'POST method required' });
        }

        try {
            const { amount, authToken } = req.body;

            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Valid amount is required' });
            }

            const options = {
                amount: Math.round(amount * 100), // Amount in paise
                currency: "INR",
                receipt: `receipt_${Date.now()}`
            };

            const order = await razorpay.orders.create(options);
            console.log('Razorpay order created (HTTP):', order.id);

            res.status(200).json({
                success: true,
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            });
        } catch (error) {
            console.error('Razorpay error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create payment order: ' + error.message
            });
        }
    });
});

// VERIFY PAYMENT - Callable Function
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { orderId, paymentId, signature, bookingId } = data;

    if (!orderId || !paymentId || !signature) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'orderId, paymentId, and signature are required'
        );
    }

    const text = orderId + "|" + paymentId;
    const generated_signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET')
        .update(text)
        .digest("hex");

    if (generated_signature !== signature) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Signature verification failed'
        );
    }

    try {
        if (bookingId) {
            await admin.firestore().collection('bookings').doc(bookingId).update({
                paymentStatus: 'paid',
                razorpayOrderId: orderId,
                razorpayPaymentId: paymentId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return {
            status: 'success',
            message: 'Payment verified and booking updated'
        };
    } catch (error) {
        console.error('Payment verification error:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to verify payment: ' + error.message
        );
    }
});