# AgriRental Full System Technical "Go-Through"

This document provides an exhaustive technical deep-dive into the AgriRental system architecture, module designs, and algorithmic implementations.

---

## 1. System Architecture & Tech Stack

### Architecture Overview
AgriRental follows a **Serverless Layered Architecture** using React Native for the client and Firebase for the backend/data layer.

*   **View Layer**: React Native (Expo) - Functional components with Hooks (`useState`, `useEffect`, `useCallback`).
*   **Service Layer**: Modular JS modules (`bookingService`, `groupBookingService`, `machineService`) encapsulating business logic.
*   **Data Access Layer**: `RealFirebase.js` - Centralized wrapper for Firestore, Auth, and Storage SDKs.
*   **External Layers**: Firebase Authentication (Session management), Firestore (Persistence), Firebase Storage (Binary assets).

### Technical Stack Detail
| Component | Technology | Role |
| :--- | :--- | :--- |
| **Framework** | React Native / Expo | Multi-platform UI execution |
| **Database** | Firestore | Real-time NoSQL document storage |
| **Auth** | Firebase Auth | Phone-based session management & Persistence |
| **Storage** | Firebase Storage | Hosting machine images & handover videos |
| **Navigation** | React Navigation | Stack and Tab based routing |
| **Logic** | JavaScript (ES6+) | Business rules and data processing |

---

## 2. Detailed Module Design

### A. Authentication & Session Module (`AuthContext.jsx`)
Defines the reactive context for user identity and role-based permissions.
*   **Persistence Technique**: Uses `onAuthStateChanged` to listen for Firebase session tokens. Upon hydration, it performs a secondary lookup in the `users` collection to retrieve the `role` and `isActive` status.
*   **Security Barrier**: Implements a `isLoading` state within `AppNavigator.jsx` that blocks the UI until the user document is verified, preventing "layout flashing".

### B. Machine Management Module (`machineService.js`)
Handles the lifecycle of agricultural equipment.
*   **State Machine**: Machines transition through `pending` -> `approved` -> `isAvailable: true/false`.
*   **Filtering Logic**: Implements multi-conditional queries (Status, OwnerId, Availability).

### C. Booking Engine (`bookingService.js`)
The core validator for temporal resource allocation.
*   **Conflict Detection Logic**: Queries all "active" or "confirmed" bookings for a specific `machineId`.
*   **Atomic creation**: Uses `addDoc` with a comprehensive payload including platform fees, driver requirements, and payment status.

### D. Group Booking (GP) Module (`groupBookingService.js`)
Manages collaborative rentals and shared financial tracking.
*   **Phase 1: Gathering**: Users join a group document.
*   **Phase 2: Scheduling**: Leader proposes a time/date.
*   **Phase 3: Shared Payment**: Each member pays a calculated `hours / groupSize` share.
*   **Phase 4: Locking**: Upon `payments.every(p => p.paid === true)`, the system creates a hard lock in the main `bookings` collection.

---

## 3. Algorithms & Techniques

### I. Time-Slot Intersection Algorithm
To prevent double-booking across individual and GP flows.
1.  **Parsing**: Convert string tokens to Float Hours.
    *   `"10AM"` -> `10.0`
    *   `"02:30 PM"` -> `14.5`
2.  **Overlap Condition**: For two ranges $[S1, E1]$ and $[S2, E2]$ on the same date:
    *   `Conflict = (S1 < E2) AND (E1 > S2)`
3.  **Application**: This is used in `checkConflict()` and in `FarmerHomeScreen` to hide machines that have already been allocated for "Today".

### II. Haversine Formula (GPS Sorting)
Calculates distance ($d$) between user $(lat1, lon1)$ and machine $(lat2, lon2)$.
$$a = \sin^2(\Delta \phi / 2) + \cos \phi_1 \cdot \cos \phi_2 \cdot \sin^2(\Delta \lambda / 2)$$
$$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
$$d = R \cdot c$$
*(Where $R = 6371$ km)*.

### III. Simulated Payment Lifecycle
Since real Razorpay endpoints are pending, the system uses a **Simulated State Machine**:
*   `SIMULATED_SUCCESS`: Triggered by `payGPShare`, generates a `SIM_` prefix transaction ID and records `paidAt: ISOString`.

---

## 4. Implementation Progress Tracking

### [0-30%] Phase 1: Infrastructure
*   [x] Firebase Project Configuration.
*   [x] Basic Phone Authentication flow.
*   [x] User profile Document creation in Firestore.
*   [x] Machine listing CRUD.

### [30-60%] Phase 2: Core Business Logic
*   [x] Booking Modal with slot selection.
*   [x] Platform fee & driver compensation calculation.
*   [x] Individual booking state management (pending/confirmed).
*   [x] Admin Dashboard session monitoring.

### [60-90%] Phase 3: Collaborative Features & Stability
*   [x] Group Booking (GP) lifecycle (Join, Schedule, Pay).
*   [x] **Strict Machine Locking**: Overlap detection between GP and Individual bookings.
*   [x] **Auth Persistence**: Session recovery on page reload for Web.
*   [x] **Profile Screen**: Live document updates for user metadata.

### [100%] Phase 4: Verification & Polish
*   [x] Numerical time-slot parsing overhaul.
*   [x] End-to-end flow verification (2-user manual test).
*   [x] Zero console error enforcement.
