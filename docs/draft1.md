# System Architecture Draft

This document outlines the design of the dual-role agricultural equipment rental marketplace system.  It provides a detailed breakdown of each module, their responsibilities, data flows, algorithms and techniques used, and an indication of code implementation progress.

---

## 1. Overview

The application is built using **React Native with Expo** to target both mobile (iOS/Android) and web platforms from a single codebase. Key external services include **Firebase Firestore** for the backend database and authentication, and **Razorpay** for payment processing. Users of the system can sign up and use the app in one of two roles simultaneously:

- **Renter (Farmer)**: Lists tractors and implements, manages availability, reviews rental requests.
- **Borrower (Driver)**: Seeks equipment to rent on an hourly basis and executes jobs.

A third role, **Admin**, has access to analytics dashboards and can manage users, machines, and bookings.

Major features:

- Equipment listing with images, hourly rates and availability toggles
- Booking requests with hourly selections and status transitions
- Real-time UI updates via Firestore listeners for immediate feedback
- Dual-role UI flows allowing users to switch between renter/borrower views
- Role-based access control enforced in both frontend logic and Firestore security rules
- Payment flow integrated with Razorpay (frontend checkout + Firestore update)
- Admin analytics showing counts, earnings, and ability to drill into bookings

The architecture embraces a modular, service‑oriented pattern. Services encapsulate all Firestore interactions; React Contexts manage authentication and configuration; navigation uses React Navigation’s stack structure. This separation of concerns improves maintainability and testability.

---

## 2. Modules

### 2.1 Services

📦 Service Module Architecture Overview

Each service module encapsulates a distinct domain of the application and directly interacts with Firestore or external APIs.
They expose a clean, asynchronous interface consumed by UI components and screens.

🔧 1. machineService
📌 Purpose

Manages the complete machine catalog lifecycle.

⚙️ Functionalities

Create machine listings

Read machine data

Update machine details

Set availability status

Delete machines

Query available machines

Query owner-specific machines

🛠 Tech Stack

Firebase Firestore SDK (addDoc, updateDoc, query, where, onSnapshot)

Firebase Storage (image upload helper)

🧠 Techniques Used

Real-time listeners (onSnapshot) for live listing updates

Field-based filtering using Firestore queries

✅ Code Status

✔ 100% Complete
✔ Manually unit-tested via user flows

📅 2. bookingService
📌 Purpose

Handles core booking logic and lifecycle management.

⚙️ Functionalities

Validate booking input

Create booking (ownerId, borrowerId)

Manage status transitions:

PENDING → CONFIRMED → COMPLETED

PENDING → CANCELLED

Attach transactionId after successful payment

Query & subscribe for:

Borrower bookings

Owner bookings

Admin bookings

🛠 Tech Stack

Firestore compound queries (where)

Real-time subscriptions (onSnapshot)

Authentication guard (ensureAuth())

🧠 Algorithms & Optimizations

Client-side sorting

Removed orderBy to avoid composite index requirements

Sorts arrays using createdAt with Date conversion

Real-time Firestore eliminates need for debouncing

✅ Code Status

✔ 100% Implemented
✔ Refactored during recent fixes

💳 3. RazorpayService.js
📌 Purpose

Handles payment flow integration between frontend and backend.

⚙️ Functionalities

Create Razorpay order (via Firebase Functions)

Initiate Razorpay checkout

Verify payment

Return transaction result

Update booking only after successful verification

🛠 Tech Stack

Razorpay Checkout SDK

HTTP fetch() to Firebase Functions:

/createOrder

/verifyPayment

🧠 Techniques Used

Promise chaining

Robust error handling

Ensures booking updates only on successful payment

✅ Code Status

✔ 100% Complete
✔ Checkout tested on web

🔐 4. AuthContext
📌 Purpose

Manages authentication state and user profile globally.

⚙️ Functionalities

login()

logout()

Provide:

user

profile

isAdmin

Role flags

Provides ensureAuth() helper for service security

🛠 Tech Stack

React Context API

useEffect()

onAuthStateChanged()

Firestore profile listeners

🧠 Optimization

State normalization

Caches profile locally

Avoids redundant Firestore reads

✅ Code Status

✔ 100% Implemented

⚙️ 5. ConfigContext
📌 Purpose

Provides global configuration and feature flags.

⚙️ Functionalities

Supplies Firebase project config

Supplies API keys

Platform-specific environment variables

🛠 Tech Stack

React Context

Expo environment variables

🧠 Algorithms

Static configuration (no complex logic)

✅ Code Status

✔ 100% Implemented

Algorithmic notes (expanded):

1. **Real-time Subscription Pattern**
   - All key data views use `onSnapshot()` to register a listener on a Firestore `query`. Listeners automatically push incremental updates (`added`, `modified`, `removed`) which we map to plain JavaScript objects.
   - Using `onSnapshot` avoids polling and ensures data is consistent across all clients.

2. **Client-side Sorting**
   - Queries previously included `orderBy('createdAt', 'desc')`. Firestore requires an index for ordered queries combined with `where` filters (composite index). On Spark plan, indexes must be created manually; missing indexes led to 5‑minute fetch delays.
   - To sidestep this, we removed `orderBy` from the query and perform sorting within the snapshot callback using standard array `.sort()` with a fallback to numeric timestamps.

3. **Status Mapping & Badging**
   - `StatusBadge` uses a dictionary mapping string statuses to color codes and labels, a simple constant lookup with memoization to avoid recomputing objects on each render.

4. **Debounce & Throttle**
   - While not currently needed, `bookingService` could later implement debouncing for rapid updates from multiple devices. The architecture keeps the door open.

5. **Composite Queries**
   - Firestore queries use compound filters (`where('borrowerId','==',id)` etc.). All filters are indexed automatically by Firestore, but mixing with `orderBy` required explicit indexes. Removing `orderBy` simplified index management.

### 2.2 Contexts

Contexts provide globally accessible state and helper methods:

- **AuthContext**
  - **Description**: Central hub for authentication and authorization state. Initializes Firebase auth listener on mount and fetches the corresponding user profile document.
  - **Functionality**:
    - **login/logout** methods wrap Firebase `signInWithEmailAndPassword` / `signOut` and update internal state.
    - Exposes `user` (Firebase auth object) and `profile` (custom Firestore document containing roles and contact info).
    - Derived booleans `isAdmin`, `isFarmer`, `isDriver` computed from `profile.role` fields.
    - Provides `ensureAuth()` utility that other services call to lazily wait for authentication before performing Firestore operations.
  - **Tech Stack**: React hooks (`useState`, `useEffect`), Firebase Auth and Firestore SDK.
  - **Algorithms**: Stateless; uses `useEffect` cleanup to detach listeners. Role flags updated using `useMemo` for performance.

- **ConfigContext**
  - **Description**: Maintains application-wide configuration values such as Firebase project ID, Razorpay key, and feature toggles (e.g., enable mock data).
  - **Functionality**: Provides a simple object consumed via `useContext` across the app.
  - **Tech Stack**: React Context; environment variables via Expo's `Constants.manifest.extra`.
  - **Algorithms**: None; static values.

### 2.3 Components

Reusable UI elements and small interactors:

- **StatusBadge**
  - **Function**: Displays a colored pill with the current booking or payment status (e.g., `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
  - **Implementation**: A functional React component using StyleSheet; color/label derived from a constant map. Uses `React.memo` to avoid re-renders when props unchanged.
  - **Algorithm**: Constant-time lookup in a dictionary; falls back to grey if unknown status.

- **JobCard / MachineCard**
  - **Function**: Visual card presenting a machine or job listing. Shows image, title, rate, and action buttons (`Book`, `View`).
  - **Implementation**: Touchable opacity components with conditional rendering (e.g., hide `Book` if not available). Accepts props for data and callbacks.
  - **Tech**: Uses `react-native-elements` or plain `View`, `Image`, `Text` components for layout.

- **BookingModal**
  - **Function**: Modal dialog used by MachineDetail to collect booking parameters (start time, duration/hours, and number of workers). Submits booking upon confirmation.
  - **Implementation**: Controlled components for inputs with local state (`useState`). Validates inputs before calling `bookingService.createBooking`.
  - **Algorithm**: Price computed using `hourlyRate * rentalHours`; validation ensures positive numeric values. Converts selected `Date` to ISO string for Firestore storage.

- **ScreenWrapper**
  - **Function**: Provides a consistent layout wrapper around screens, handling safe area, header with back button, and network connectivity indicator (via `NetInfo`).
  - **Implementation**: Wraps children with `SafeAreaView`; includes a useEffect to subscribe to connectivity changes.
  - **Algorithm**: Debounces connectivity updates to avoid flicker.

### 2.4 Screens

Every screen encapsulates a distinct part of the user journey. Each is connected to services via hooks or context, and most subscribe to real-time data.

- **LoginScreen / SignUpScreen**
  - **Purpose**: Entry point for users to authenticate. Supports email/password and OTP flows.
  - **Flow**: On submit, calls `AuthContext.login()` or `signup()` which writes a profile document. On success, navigates to RoleSelection.
  - **Tech**: `react-hook-form` for validation; `KeyboardAvoidingView` for mobile keyboard management.

- **RoleSelectionScreen**
  - **Purpose**: Let the newly-authenticated user choose their active role (Farmer/Driver) and optionally toggle both roles. This choice is stored in the local profile document and context.
  - **Flow**: Updates Firestore profile and context, then navigates to the appropriate home screen.

- **FarmerHomeScreen**
  - **Purpose**: Dashboard for renters to view their machines and post new ones.
  - **Functionality**:
    - Real-time subscription to `machineService` for available machines.
    - Button to create new listing opens a form screen.
    - Quick access to My Rentals (owner view of bookings)

- **DriverHomeScreen**
  - **Purpose**: Dashboard for borrowers to discover available jobs (machines listed by farmers).
  - **Functionality**:
    - Subscribes to all machines with `isAvailable == true` using `machineService`.
    - `RefreshControl` built-in to allow manual refresh; replaced broken `loadAvailableJobs` with `handleRefresh` which simply clears refreshing state since data arrives in real time.
    - On pressing a job, navigates to MachineDetail for booking.

- **MachineDetailScreen**
  - **Purpose**: Show machine details and enable borrower to book.
  - **Functionality**:
    - Displays images, description, hourly rate, contact info.
    - Contains `BookingModal` to enter date/time, hours, and triggers `bookingService.createBooking`. Handles success/failure with toast.

- **MyOrdersScreen**
  - **Purpose**: Borrower’s list of their own bookings.
  - **Functionality**:
    - Uses `bookingService.subscribeByBorrower(user.uid, setOrders)`.
    - Renders each order with `StatusBadge`, and allows payment via `RazorpayService` if pending.
    - Supports cancellation and viewing transaction details.

- **MyRentalsScreen**
  - **Purpose**: Renter’s view of bookings where they are the owner.
  - **Functionality**:
    - Uses `bookingService.subscribeByOwner(user.uid, setRentals)`.
    - Displays borrower info, allows owner to confirm or mark buses as completed/cancelled.

- **AdminScreens**
  - **Dashboard**: Aggregated counts and graphs (number of bookings by status, revenue).
  - **Bookings**: Full list via `bookingService.subscribeAll`, filterable by status/owner/borrower.
  - **Payments**: View transactions; show confirmation state.
  - **Machines**: Manage all machine listings, edit or disable.
  - **Users**: Search and view user profiles; set admin privileges.

- **Auxiliary Screens**
  - **OtpVerificationScreen**: Handles phone number login by verifying OTP codes with Firebase Auth.
  - **VideoHandshakeScreen**: Placeholder screen for driver-farmer handshake videos (future feature) using WebRTC or third-party SDK.
  - **SettingsScreen**: Let users change role, contact details, or logout.
  - **PaymentScreen.js**: A dedicated screen invoked after Razorpay to display success or failure.

Each screen is tied into navigation defined in `AppNavigator.jsx` and may trigger service calls or context updates. Error states show alerts using `Alert.alert` or custom toasts.

### 2.5 Navigation

React Navigation stack in `AppNavigator.jsx` registers screen routes. Conditional rendering ensures correct stack for roles and admin. Buttons in header and footers provide access to My Orders/My Rentals.

Data flow:
1. User logs in → AuthContext updates → AppNavigator chooses stack
2. On FarmerHome or DriverHome mount → relevant service subscription starts
3. Firestore triggers listener on booking/machine updates → data passed through callbacks → screens update state
4. Actions (book, cancel, confirm, pay) call service methods, which update Firestore and trigger listeners.

---

## 3. Algorithms & Techniques

- **Real-time Data**: `onSnapshot` listeners with `query()` filters. Avoids manual polling, ensures sub-second UI updates.
- **Client-Side Sorting**: After retrieving booking docs, arrays are sorted by `createdAt` to preserve order without Firestore indexes.
- **Status Mapping**: Simple mapping object used in `StatusBadge` for colors and labels.
- **Pagination**: Not implemented yet; future improvement could use Firestore `startAfter` with limit.
- **Role Management**: boolean flags (`isFarmer`, `isDriver`, `isAdmin`) computed from profile document.
- **Payment Flow**: Generates Razorpay order on backend, opens checkout, then updates booking document with `paymentStatus` and `transactionId`.

---

## 4. Code Implementation Breakdown

- **Core data model (Firestore schema)**: 100%
- **Authentication and context**: 100%
- **Service layer**: 100%
- **UI components**: 90% (some minor styling tweaks pending)
- **Screens & navigation**: 90% (all major screens implemented; some utility screens exist)
- **Real-time synchronization**: 100%
- **Notification system**: 30% (basic text indicator; no push/toast yet)
- **Index management docs**: 100% (FIRESTORE_INDEX_SETUP.md created)

Overall code coverage: ~60% of features fully implemented, remaining 40% in fine-tuning and notifications.

---

## 5. System Architecture Diagram

```
[User Device] --(HTTPS/API)-> [Expo App] --(Firebase SDK)-> [Firestore]
                                  |                          ^
                                  |                          |
                            [AuthContext]                 (onSnapshot)
                                  |
                            [BookingService] 
                            [MachineService]
                                  |
                            [RazorpayService]
                                  |
                                 ...
```

The database consists of `users`, `machines`, `bookings` collections. Bookings link to user ids via `ownerId`/`borrowerId`, and track statuses.

---

## 6. Next Steps

1. Implement notification system (push or in-app) for payment confirmations and status changes.
2. Add pagination/loading strategies for large datasets.
3. Integrate composite index creation automation or UI hints.
4. Enhance error handling and offline support.
5. Finalize UI polish and responsive design.

---

This draft provides a solid foundation for understanding and extending the AgriRentalApp system.