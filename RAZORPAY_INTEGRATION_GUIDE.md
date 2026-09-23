# Razorpay Payment Gateway Integration Guide

## 1. Overview & Architecture

Spendly integrates **Razorpay Payment Gateway** to facilitate authenticated, verified monetary transfers and payments. While Account Aggregator (Setu) provides read-only historical bank data, Razorpay powers the transactional action layer—allowing users to execute payments using UPI, Credit/Debit Cards, Netbanking, or Wallets directly within the app.

---

## 2. Credentials & Environment Setup

Add the following credentials to your `.env` file (`client/personal-finance-app/.env`):

```env
# Razorpay Sandbox Credentials
RAZORPAY_KEY_ID=rzp_test_TfUDVxRMXrslUg
RAZORPAY_KEY_SECRET=lR5qAkE9q23S9pVohbbOQmVq
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_TfUDVxRMXrslUg
```

- **`RAZORPAY_KEY_ID`**: Public identifier used server-side to communicate with the Razorpay Orders API via HTTP Basic Auth.
- **`RAZORPAY_KEY_SECRET`**: Private secret key strictly preserved server-side to calculate and verify HMAC-SHA256 signatures.
- **`NEXT_PUBLIC_RAZORPAY_KEY_ID`**: Client-accessible key used to mount the Razorpay Checkout JavaScript SDK (`checkout.js`).

---

## 3. End-to-End Payment Flow

```
1. User enters Transfer Details (Amount, Recipient, Category, Note)
              │
              ▼
2. POST /api/razorpay/create-order
   • Authenticates session
   • Validates amount (> ₹0, converted to integer paise)
   • Calls Razorpay Orders API (https://api.razorpay.com/v1/orders)
   • Returns { orderId, amount, currency: "INR", key }
              │
              ▼
3. Client opens Razorpay Checkout Modal (window.Razorpay)
   • User chooses payment method: UPI (QR/Apps), Cards, Netbanking
   • User completes payment authorization in test mode
              │
              ▼
4. Razorpay returns Success Callback
   • razorpay_order_id
   • razorpay_payment_id
   • razorpay_signature
              │
              ▼
5. POST /api/razorpay/verify-payment
   • Computes expectedSignature = HMAC_SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
   • Compares computed signature with client-supplied razorpay_signature
   • IF VALID:
       - Inserts record into `transactions` table (Postgres)
       - Fires `checkAndSendOverspendAlert` to evaluate budget impact
       - Returns { success: true, transactionId, paymentId }
   • IF INVALID:
       - Returns HTTP 400 Bad Request
              │
              ▼
6. Client displays Verified Success Receipt
   • Real Razorpay Payment ID (`pay_...`)
   • Verified badge
   • Instant synchronization with Cashflow and Safe-to-Spend
```

---

## 4. API Specifications

### A. Create Order
- **Endpoint:** `POST /api/razorpay/create-order`
- **Authentication:** Required (`auth()`)
- **Request Body:**
  ```json
  {
    "amount": 500,
    "recipientName": "Rahul Sharma",
    "upiId": "rahul@upi",
    "category": "Food",
    "note": "Dinner bill split"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "orderId": "order_EKfMRda80eA846",
    "amount": 50000,
    "currency": "INR",
    "key": "rzp_test_TfUDVxRMXrslUg"
  }
  ```

### B. Verify Payment
- **Endpoint:** `POST /api/razorpay/verify-payment`
- **Authentication:** Required (`auth()`)
- **Request Body:**
  ```json
  {
    "razorpay_order_id": "order_EKfMRda80eA846",
    "razorpay_payment_id": "pay_29QQoUBcxNqdf",
    "razorpay_signature": "9ef4d34...312df",
    "transferDetails": {
      "amount": 500,
      "recipientName": "Rahul Sharma",
      "upiId": "rahul@upi",
      "category": "Food",
      "note": "Dinner bill split"
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "transactionId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "paymentId": "pay_29QQoUBcxNqdf"
  }
  ```

---

## 5. Razorpay Sandbox Test Data

When testing in Razorpay Test Mode:

### UPI Testing
- **UPI ID:** Any valid format, e.g., `success@razorpay`
- **Intent / QR:** Click "Success" in the Razorpay test simulator modal to simulate instant approval.

### Test Cards
| Card Network | Card Number | Expiry | CVV | OTP |
|---|---|---|---|---|
| **Visa (Domestic)** | `4111 1111 1111 1111` | Any future date | `123` | Any OTP or `123456` |
| **Mastercard** | `5123 4567 8901 2345` | Any future date | `123` | Any OTP or `123456` |
| **RuPay** | `5081 2611 1111 1111` | Any future date | `123` | Any OTP or `123456` |

### Netbanking Testing
- Select any bank (e.g. HDFC, SBI, ICICI) and select **"Success"** on the mock authorization screen.

---

## 6. Financial Ledger & Budget Synchronization

Once a payment is verified:
1. An expense entry is inserted into the `transactions` PostgreSQL table:
   - `amount`: Converted to paise (e.g., ₹500.00 = `50000`)
   - `type`: `"expense"`
   - `category`: User-selected category (`"Food"`, `"Transport"`, `"Shopping"`, etc.)
   - `merchant`: `"Transfer → Rahul Sharma"`
   - `description`: `"Razorpay Payment ID: pay_... | Order: order_... | Note: ..."`
   - `source`: `"MANUAL"`
2. The transaction immediately impacts:
   - **Daily Safe-to-Spend**: Deducts from today's quota.
   - **Month-to-Date Cashflow**: Increments total expenses in the Money tab.
   - **Plan Allocations**: Adjusts Category envelope utilization.
   - **Overspending Guard**: Automatically evaluates limits and triggers notifications if breached.
