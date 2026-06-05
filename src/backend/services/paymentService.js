/**
 * paymentService.js
 * Razorpay payment helpers for FarmEquipConnect.
 *
 * ⚠️  SETUP:  Replace the placeholder below with your real Razorpay Key ID.
 *   - Test mode key  →  rzp_test_XXXXXXXXXXXX
 *   - Live mode key  →  rzp_live_XXXXXXXXXXXX
 *   Get it from: https://dashboard.razorpay.com → Settings → API Keys
 *
 * The secret key is NOT needed here – we use Razorpay's hosted checkout JS
 * which only requires the public Key ID on the client.
 */

// ─── Replace with your Razorpay Key ID ──────────────────────────────────────
export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_REPLACE_WITH_YOUR_KEY';

/**
 * Generates a local order reference ID.
 * In a production setup this would come from your backend Razorpay API call.
 * For Spark plan (no Cloud Functions) we generate it client-side.
 */
export const generateOrderId = () => `ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

/**
 * Builds a self-contained HTML page that:
 *  1. Loads Razorpay checkout.js from CDN.
 *  2. Auto-opens the payment widget.
 *  3. Posts the result back to React Native via window.ReactNativeWebView.postMessage.
 *
 * @param {number}  amount        Amount in INR (e.g. 800 → ₹800). Converted to paise internally.
 * @param {string}  orderId       Local order reference ID.
 * @param {string}  description   Short description (e.g. machine name).
 * @param {string}  prefillName   Customer full name.
 * @param {string}  prefillContact  Customer phone or email.
 * @returns {string} HTML string to load in WebView.
 */
export const buildRazorpayHTML = (amount, orderId, description, prefillName, prefillContact) => {
  const amountInPaise = Math.round(amount * 100);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div style="text-align: center;">
    <p style="font-family: sans-serif; color: #666; font-size: 14px;">Opening Secure Payment...</p>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function postMessage(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      } else {
        window.parent.postMessage(JSON.stringify(data), '*');
      }
    }

    window.addEventListener('load', function () {
      var options = {
        key: '${RAZORPAY_KEY_ID}',
        amount: ${amountInPaise},
        currency: 'INR',
        name: 'FarmEquipConnect',
        description: '${description.replace(/'/g, "\\'")}',
        order_id: '',        // Leave blank – we're not using backend order creation
        prefill: {
          name: '${prefillName.replace(/'/g, "\\'")}',
          contact: '${prefillContact.replace(/'/g, "\\'")}',
        },
        theme: { color: '#0A192F' },
        modal: {
          backdropclose: false,
          escape: false,
          ondismiss: function () {
            postMessage({ success: false, error: 'Payment cancelled by user.' });
          }
        },
        handler: function (response) {
          postMessage({
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id || '${orderId}',
            signature: response.razorpay_signature || '',
          });
        }
      };

      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        postMessage({
          success: false,
          error: response.error.description || 'Payment failed.',
          code: response.error.code,
        });
      });

      // Auto-open after short delay so WebView is ready
      setTimeout(function () { rzp.open(); }, 500);
    });
  </script>
</body>
</html>`;
};

