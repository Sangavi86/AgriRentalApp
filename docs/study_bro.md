# FarmEquipConnect (AgriRental) - Technical Study Guide

This document provides a comprehensive technical overview of the FarmEquipConnect system, structured as a Deep Review / Viva Guide. It is designed to explain the core mechanics, data models, and algorithms that power the application.

---

## 1️⃣ FIRESTORE DATA MODEL (MOST CRITICAL)

**Question: Provide complete Firestore schema for all collections including field types, relationships, and example documents.**

Our entire system is data-driven via Firebase Firestore. Understanding this schema is fundamental to explaining the backend logic, mapping services to the database, and detailing our algorithms.

### 👥 `users` Collection
Stores all participants in the marketplace.

```json
{
  "id": "uX9kLp...",
  "name": "Ramu Patel",
  "role": "farmer", // Other roles: "owner", "operator", "admin"
  "phone": "+91 9876543210",
  "district": "Coimbatore",
  "village": "Sulur",
  "isAvailable": true, // Relevant for operators
  "createdAt": "timestamp"
}
```

### 🚜 `machines` Collection
The core inventory of the platform.

```json
{
  "id": "mQ2wEr...",
  "name": "Mahindra 575 DI Tractor",
  "ownerId": "uA1bCc...", // Foreign Key -> users.id
  "baseHourlyRate": 800,
  "hasGPS": true,
  "location": {
    "lat": 11.0168,
    "lng": 76.9558,
    "district": "Coimbatore"
  },
  "isAvailable": true,
  "type": "Tractor",
  "status": "active"
}
```

### 📅 `bookings` Collection
The transactional heart of the system.

```json
{
  "id": "bK8jHh...",
  "machineId": "mQ2wEr...", // Foreign Key -> machines.id
  "ownerId": "uA1bCc...",   // Foreign Key -> users.id
  "renterId": "uX9kLp...",  // Foreign Key -> users.id
  "driverId": "uD4fGg...",  // Foreign Key -> users.id (Nullable initially)
  "bookingDate": "2026-04-20",
  "timeSlot": "09:00 - 14:00",
  "totalHours": 5,
  "totalAmount": 4000,
  "bookingStatus": "confirmed", // See flow below
  "gpsStatus": "SAFE",
  "paymentStatus": "paid",
  "boundary": {
    "lat": 11.0168,
    "lng": 76.9558,
    "radius": 5 // in kilometers
  }
}
```

---

## 2️⃣ BOOKING STATUS FLOW (STATE MACHINE)

**Question: List all booking states and transitions for both Individual and Group Booking.**

The system operates as a state machine. Understanding these transitions is crucial for tracking the lifecycle of an order and explaining triggers (e.g., when GPS activates).

### Individual Booking Flow
`requested` → `confirmed` → `driver_assigned` → `dispatched` → `active` → `completed` → `cancelled`

**State Triggers:**
*   **requested**: Triggered by Renter (Farmer) upon creation.
*   **confirmed**: Triggered by Owner accepting request & payment verification.
*   **driver_assigned**: Triggered by Owner or System selecting an operator.
*   **dispatched**: Triggered by Owner (Starts GPS Tracking).
*   **active**: Triggered by Renter (Confirms receipt of machine).
*   **completed**: Triggered by Owner/Renter upon job finish.

### Group Booking Flow
`gathering_requests` → `scheduling` → `waiting_payment` → `confirmed` → `active` → `completed` → `cancelled`

---

## 3️⃣ GPS SYSTEM STRUCTURE

**Question: Explain how GPS data is stored, updated, and used in the system.**

GPS Tracking is a major differentiator, ensuring asset security and operational transparency.

**Structure:**
```json
// Inside the booking document
{
  "gpsStatus": "SAFE", // Can be: "SAFE" | "NEAR_BOUNDARY" | "OUT_OF_RANGE" | "ALERT" | "NO_SIGNAL"
  "lastLocation": {
    "lat": 11.0200,
    "lng": 76.9600
  },
  "boundary": {
    "lat": 11.0168,
    "lng": 76.9558,
    "radius": 5
  },
  "gpsLastUpdate": "timestamp" // Updated every 5 seconds
}
```

*   **When is it active?** GPS tracking is only triggered when `bookingStatus = dispatched OR active`.
*   **Algorithm:** Calculates distance between `lastLocation` and `boundary` center. Alerts trigger if distance > radius.

---

## 4️⃣ DRIVER / OPERATOR MODEL

**Question: Explain how operators are stored, filtered, and assigned to bookings.**

Connects the marketplace logic to the operational execution.

*   **Storage:** Stored in the `users` collection with `role: "operator"`.
*   **Additional Fields:** `speciality` (e.g., "Harvester", "Tractor"), `district`, `isAvailable` (boolean).
*   **Filtering & Assignment:**
    *   System filters operators based on `district` priority and `isAvailable == true`.
    *   Owner selects from the filtered list.
    *   Assignment updates the booking document: `booking.driverId = selectedOperatorId`.

---

## 5️⃣ PAYMENT SYSTEM

**Question: Explain payment schema and validation logic for both individual and group bookings.**

Payments control booking confirmation and machine locking.

### Individual Bookings
*   `paymentStatus`: Can be `"pending"` | `"paid"` | `"refunded"`.
*   Handled via Razorpay integration.

### Group Bookings
Because multiple farmers split costs, the schema handles partial payments:
```json
{
  "payments": [
    {
      "userId": "uX9kLp...",
      "amount": 2400,
      "paid": true,
      "paymentId": "pay_xyz",
      "refunded": false
    },
    // ... other members
  ]
}
```
*   **Validation Logic:** The overall booking only moves to `confirmed` status `if (payments.every(p => p.paid))`.

---

## 6️⃣ SERVICES LAYER (ARCHITECTURE)

**Question: List all service files and explain the responsibility of each.**

We use a Serverless Architecture where Firebase acts as a Backend-as-a-Service (BaaS).

| Service File | Primary Responsibility |
| :--- | :--- |
| `AuthContext.jsx` | Manages user session, login state, and role-based access. |
| `machineService.js` | Handles CRUD operations for machines in the marketplace. |
| `bookingService.js` | Manages the lifecycle of individual bookings. |
| `groupBookingService.js`| Handles complex cooperative scheduling and split payments. |
| `mockGpsService.js` | Simulates real-time hardware GPS location updates and boundary math. |
| `paymentService.js` | Integrates Razorpay checkout and verifies payment success. |

---

## 7️⃣ REAL-TIME SYSTEM ⚡

**Question: Where and why are onSnapshot listeners used?**

This provides the "Real-Time UX" that differentiates our app from traditional refresh-based web apps.

*   **Usage:** `onSnapshot(collection(db, "bookings"), callback)`
*   **Where:** Booking updates dashboards, GPS tracking maps, Group booking coordination screens.
*   **Why:** Removes the need for manual refresh. The UI instantly reacts to backend state changes (e.g., when a driver is dispatched, the farmer sees it moving immediately).

---

## 8️⃣ CONFLICT DETECTION ALGORITHM ⛔

**Question: How do you prevent double booking?**

The core algorithm for marketplace integrity.

```javascript
// Time-slot Overlap Logic
function rangesOverlap(reqStart, reqEnd, existingStart, existingEnd) {
  // A conflict exists if the requested start is BEFORE the existing end
  // AND the requested end is AFTER the existing start.
  return reqStart < existingEnd && reqEnd > existingStart;
}
```

*   **Application:** When a user requests a booking, the system queries existing bookings for the *Same Machine* on the *Same Date*. It then applies the `rangesOverlap` check to ensure the new `timeSlot` fits.

---

## 9️⃣ GROUP BOOKING LOGIC 👥

**Question: Explain how group booking works internally.**

Our unique feature for small-holder farmers to afford heavy machinery.

1.  **Request Phase:** Users request specific hour chunks.
2.  **Constraint Check:** System ensures Total Requested Hours ≤ Max Daily Limit (e.g., 12 hours).
3.  **Coordination:** A group leader finalizes the request.
4.  **Allocation:** System splits the overall day slot into sequential sub-slots for each farmer.
5.  **Payment Split:** Individual payment links are generated based on proportion of hours. Conflict prevention locks the machine pending group payment completion.

---

## 🔟 FULL FLOW (END-TO-END)

**Question: Explain complete flow from listing → booking → return → feedback.**

Connecting all modules in the marketplace lifecycle:

1.  **Listing:** Owner adds machine via `machineService` → Globally visible in `machines` collection.
2.  **Discovery:** Farmer views filtered list based on location.
3.  **Booking:** Farmer selects slot; `bookingService` checks conflicts and creates 'requested' booking.
4.  **Payment:** Farmer pays via Razorpay (`paymentService`).
5.  **Confirmation:** Owner confirms. Booking state → `confirmed`.
6.  **Assignment:** Owner selects Operator. Booking state → `driver_assigned`.
7.  **Dispatch:** Owner dispatches machine; `mockGpsService` begins emitting data. Booking state → `dispatched`.
8.  **Execution:** Farmer receives machine. Booking state → `active`.
9.  **Completion:** Work finishes, machine returned. Booking state → `completed`.
10. **Feedback:** Ratings are submitted updating User/Machine reputation.

---

# PART 2: DEEP REVIEW QUESTIONS

### 1. What is the complete Tech Stack of the system?
*   **Language:** TypeScript/JavaScript (For rapid development and type safety reducing runtime bugs).
*   **Frontend:** React Native (Expo) - Chosen for a single codebase exporting to both Android (mobile) and Web platforms.
*   **Backend / Cloud:** Firebase Provides a BaaS model eliminating server management.
    *   *Authentication:* User login/signup securely.
    *   *Firestore:* NoSQL real-time database.
    *   *Storage:* For machine images and profile media.
*   **Payments:** Razorpay (Used for secure, compliant transactions and verification).

### 2. How does the system architecture work (Frontend ↔ Backend)?
It is a **Flow-Based Serverless Architecture**.
1.  User interacts with UI (React Native).
2.  UI calls the API/Service layer (e.g., `bookingService`).
3.  Service layer uses Firebase SDK to communicate with Firestore.
4.  Firestore updates the data.
5.  `onSnapshot()` listeners receive the change and send real-time updates back to the UI.

### 3. How does Authentication and Role-Based Access work?
*   Uses Firebase Authentication.
*   Upon login, the system fetches the user's document from the `users` collection.
*   The system reads the `role` field (`farmer`, `owner`, `admin`, `driver`).
*   **Routing Logic:** Found in `AppNavigator.jsx`, the system applies Role-Based Access Control (RBAC) to render only the screens permitted for that specific role.

### 4. Explain Machine Listing Flow (Owner → Marketplace)
1.  Owner fills out the "Add Machine" form.
2.  Data sent via `machineService.js` to Firestore `machines` collection.
3.  Stored fields include `name`, `district`, `hasGPS`, `baseHourlyRate`, `isAvailable`.
4.  **Impact:** Machines become globally visible. Farmers' home screens dynamically fetch and filter these machines based on location.

### 5. Explain Booking Flow (End-to-End)
*(See Section 10 Full Flow detail above)*. Key milestones are conflict validation (Date ≥ Today + Lead Time), Payment gateway handoff, and the handover of State control from Farmer → System → Owner → Operator → Farmer.

### 6. What Algorithms are used and where?
1.  **Nearest Machine Selection:** `FarmerHomeScreen.jsx` - Compares user district or GPS proximity.
2.  **Time Conflict Detection:** `bookingService.js` - `reqStart < existingEnd && reqEnd > existingStart` (Prevents double booking).
3.  **Role-Based Access Control (RBAC):** `AuthContext.jsx` / `AppNavigator.jsx`.
4.  **Mock GPS Algorithm:** `mockGpsService.js` - `distance = getDistance(); if d <= R -> SAFE; else if d <= R+2 -> OUT_OF_RANGE`.

### 7. Why Group Booking Feature?
*   **Problem:** Heavy machinery is expensive to rent for a full day if a small-holder farmer only needs it for 2 hours.
*   **Solution:** Allow multiple farmers in the same locality to share a machine on the same day.
*   **Benefits:** Cost splitting for farmers, efficient continuous usage for owners, reduced idle transportation time.

### 8. Explain Group Booking Flow
*(See Section 9 Group Booking Logic above)*. Key element is that the booking is held until *all* participants fulfill their payment obligation.

### 9. Explain GPS Tracking System (Mock)
*   **Trigger:** Starts when a booking moves to `dispatched`.
*   **Action:** `mockGpsService` spins up. Every 5 seconds it generates a new coordinate, calculates the distance from the defined field boundary, and updates Firestore.
*   **States emitted:** SAFE, NEAR_BOUNDARY, OUT_OF_RANGE, ALERT, NO_SIGNAL.

### 10. Explain Frontend–Backend Interaction (File-Level)
*   **Login Menu:** `AuthContext.jsx` ↔ Firebase Auth
*   **Browse Catalog:** `machineService.js` ↔ Firestore (`machines`)
*   **Create Order:** `bookingService.js` ↔ Firestore (`bookings`)
*   **Checkout:** `PaymentWebViewScreen.jsx` ↔ Razorpay API ↔ `paymentService.js`
*   **Live Tracking:** `mockGpsService.js` ↔ Firestore (`bookings.gpsStatus`)

### 11. Explain Modules & Their Responsibilities
1.  **Auth Module:** Handles session and security.
2.  **Machine Module:** Asset management (CRUD operations).
3.  **Booking Module:** Transaction lifecycle state machine.
4.  **Group Booking Module:** Complex multi-user scheduling logic.
5.  **Payment Module:** Financial transaction integrity.
6.  **GPS Module:** Geo-spatial tracking and alerting.

### 12. Explain Methodology Used
1.  **Requirement Analysis:** Understand farmer, owner, and operator needs.
2.  **System Design:** App flow, Database schema architecture, UI/UX Mockups.
3.  **Frontend Development:** Building React Native interfaces.
4.  **Backend Configuration:** Firebase BaaS setup (DB, Storage, Rules).
5.  **Payment Integration:** Hooking up Razorpay workflows.
6.  **Media Handling:** Expo Camera integration and Firebase Storage.
7.  **Testing:** Component level and integration testing.
8.  **Deployment:** Expo Application Services (EAS) build and Firebase hosting.
9.  **Maintenance:** Bug triage and iterative feature updates.
