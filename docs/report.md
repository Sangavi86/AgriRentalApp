## AgriRentalApp – Project Report

### 1. Architecture Overview

AgriRentalApp is a **React Native + Expo** application that targets **mobile (Expo Go)** and **web (Expo web)** with a shared codebase. The architecture is structured into:

- **Presentation layer (screens & components)**: Located under `src/screens` and `src/components`. Screens orchestrate user flows (farmer, driver, admin). Components (`MachineCard`, `ScreenWrapper`, `StatusBadge`, etc.) implement reusable UI.
- **Domain / service layer**: Under `src/services`. Each service module encapsulates all Firestore interaction for a given domain:
  - `firebase/config.js` – Single initialization for **Firebase App**, **Auth**, **Firestore** (with `initializeFirestore` & `experimentalForceLongPolling` for web), and **Storage**, plus `ensureAuth` helper.
  - `AuthContext.jsx` – Auth provider that uses `RealAuth` from `RealFirebase.js` for phone-based login and role management.
  - `RealFirebase.js` – “Real” Firebase facade for admin-heavy workflows (user management, machine CRUD, bookings, video storage) built on top of the shared `auth`, `db`, `storage` exports from `firebase/config.js`.
  - `machineService.js` – CRUD + queries for `machines` collection.
  - `bookingService.js` – All logic for **individual bookings** in `bookings` collection (validation, conflict detection, create/cancel, real-time subscriptions).
  - `groupService.js` – CRUD & discovery for **farmer groups** (`groups` collection) with radius-based membership checks (Haversine).
  - `groupBookingService.js` – Full **group booking (GP)** lifecycle on `groupBookings` plus linkage into `bookings` and `driverJobs`.
  - `driverService.js` – Driver registration and job handling.
  - Additional services (`ratingService`, `driverService`, etc.) implement supporting features.
- **State / context layer**:
  - `AuthContext` – current user, role, login/logout.
  - `ConfigContext` – app-level configuration and flags used in screens like `DriverHomeScreen`.
- **Navigation**: React Navigation (stack/tab) wires screens such as `GroupsListScreen`, `GroupDetailsScreen`, `GroupBookingScreen`, farmer dashboards, driver portal, and admin panel.

Data flow is **unidirectional**:

1. Screen dispatches actions via service methods (e.g. `groupBookingService.createGPBooking`).
2. Services perform `ensureAuth()`, call Firestore, and return normalized JS objects.
3. Screens update local React state and render UI; some subscribe to real-time updates via `onSnapshot`.

### 2. Tech Stack

- **Frontend**
  - **React Native** with **Expo** (web + native targets).
  - **React Navigation** for screen stacks and tabs.
  - **React Context** for auth and config.
  - **React Native Web** enables the same components to run in the browser.
  - Design system: custom `Theme.js` with:
    - `Colors` (navy + gold, semantic colors, background shades),
    - `Spacing`, `FontSize`, `BorderRadius`, `Shadows`,
    - `Glass` helpers for “glassmorphism” containers.
- **Backend**
  - **Firebase**:
    - **Auth** (anonymous under-the-hood support to satisfy Firestore rules; app-level phone login via `RealAuth.loginWithPhone`).
    - **Cloud Firestore** as main database:
      - Collections: `users`, `machines`, `groups`, `groupBookings`, `bookings`, `driverJobs`, `drivers`, plus admin-related collections.
    - **Storage** for video handshakes (`handshakes/` folder).
  - Firestore rules and indexes configured via `firestore.rules`, `FIRESTORE_INDEX_SETUP.md`, and `deploy_firestore_rules.js`.

### 3. Core Algorithms & Business Logic

#### 3.1 Group Discovery & Radius Validation

Implemented in `groupService.js`:

- `createGroup(name, leaderId, location, radiusLimit)`:
  - Writes `groups/{groupId}` with:
    - `name`, `leaderId`, `location` (village, district, lat, lng),
    - `radiusLimit` (km),
    - `members: [leaderId]`,
    - `createdAt`.
- `joinGroup(groupId, userId, userLocation)`:
  - Reads target group.
  - Computes distance using **Haversine formula**:
    - Inputs: group center `groupData.location.lat/lng`, user location.
    - Output: distance in kilometers.
  - Rejects if:
    - `dist > groupData.radiusLimit` → throws `"Location outside group radius..."`.
    - user already in `groupData.members`.
  - On success, updates `members` via `arrayUnion(userId)`.
- `getGroupsByUser(userId)` and `discoverGroups(userId)`:
  - Returns:
    - Groups where `members` contains `userId` (for “My Groups”).
    - Groups where user is *not* a member (for “Discover” list).

This matches spec sections **1–3** (group creation, discovery, membership rules).

#### 3.2 Individual Booking Validation & Conflict Detection

Implemented in `bookingService.js`:

- **Validation (`validateInputs`)**:
  - Ensures dates are valid, not in the past, and `end >= start`.
  - Caps rental hours at `MAX_HOURS = 12`.
  - Requires time slot selection.
- **Conflict detection (`checkConflict`)**:
  - Queries `bookings` for given `machineId` and `bookingStatus != 'cancelled'`.
  - Parses dates into `Date` and checks range overlap \( \text{rangesOverlap}(s_1,e_1,s_2,e_2) = s_1 \le e_2 \wedge s_2 \le e_1 \).
  - Any overlapping booking returns `{ conflict: true, booking }`.
- **Booking creation (`createBooking`)**:
  - Re-runs `checkConflict` server-side.
  - Normalizes pricing breakdown (`machineAmount`, `driverAmount`, `platformFee`, `totalAmount`).
  - Writes full booking payload with:
    - Machine details, owner/borrower details.
    - Rental dates, `timeSlot`, `totalDays`.
    - Pricing & fees.
    - Flags: `needDriver`, `driverId`, `driverStatus`, `bookingStatus`, `paymentStatus`.
    - Audit fields: `createdAt`, `transactionId`, media URLs, rating fields.

This underpins both **single-farmer** and **group** booking conflict checks.

#### 3.3 Group Booking (GP) Lifecycle

Implemented in `groupBookingService.js` + `GroupDetailsScreen.jsx` + `GroupBookingScreen.jsx` and follows the 14-step spec.

##### 3.3.1 Creation (Leader)

- **Screen**: `GroupsListScreen` → `GroupDetailsScreen`.
- **Create Group Booking** (leader only):
  - `GroupDetailsScreen` shows “Start Group Booking Session” only if `isLeader`.
  - On click, it loads approved machines and shows the **machine picker**.
  - On selecting a machine:
    - Calls:
      ```js
      const bookingId = await groupBookingService.createGPBooking(
        groupId,
        machine,
        date /* today */,
        4 /* totalDuration hours */,
        user.uid /* leaderId */
      );
      ```
    - Shows inline status text and success Alert, then navigates to `GroupBookingScreen` with `{ bookingId }`.
- **Service**: `groupBookingService.createGPBooking`:
  - Performs conflict check via `bookingService.checkConflict` for that date.
  - Creates `groupBookings/{id}` with:
    - `groupId`, `leaderId`, `machineId`, `machineName`, `machineImage`,
    - `bookingDate`, `totalDuration`, `baseHourlyRate`,
    - `status: 'gathering_requests'`,
    - `timingRequests: []`, `timeSlots: []`, `payments: []`,
    - `createdAt`.

##### 3.3.2 Timing Requests (Members)

- **Screen**: `GroupBookingScreen`.
- Shows booking summary (date, duration, rate) and group name.
- **Member request validation (`handleRequestHours`)**:
  - Checks:
    - Hours entered.
    - User is part of group (`group.members` contains `user.uid`).
    - Booking status is `gathering_requests`.
    - Hours is a positive number, <= 12.
    - Total of existing `timingRequests.requestedHours + newHours <= 12`.
  - If any rule fails, shows a clear `Alert` (“Missing Info”, “Not a member”, “Too long”, etc.).
  - On success:
    - Calls `groupBookingService.requestTiming(bookingId, user.uid, hours)`.
    - Service merges/overwrites member’s existing entry in `timingRequests`.
    - Screen reloads booking and surfaces success Alert.

##### 3.3.3 Move to Scheduling (Leader)

- **Screen**: `GroupBookingScreen`.
- When:
  - `isLeader`,
  - `booking.status === 'gathering_requests'`,
  - at least one `timingRequests` entry exists,
  - it shows “Move to Scheduling” card.
- Clicking the button:
  - Calls `groupBookingService.moveToScheduling(bookingId, user.uid)`.
  - Service:
    - Ensures booking exists.
    - Confirms `leaderId` match.
    - Confirms current `status === 'gathering_requests'`.
    - Updates status to `'scheduling'`.
  - Screen reloads and shows informative Alert.

##### 3.3.4 Leader Scheduling & Slot Validation

- **Screen**: `GroupBookingScreen`.
- When `isLeader && booking.status === 'scheduling'`, shows:
  - “Leader: Finalize Schedule” card.
  - On click, `handleFinalizeSchedule`:
    - Ensures status is `'scheduling'` (otherwise Alert).
    - Maps each `timingRequests` entry into a time slot starting from 8 AM:
      - `startTime = 08:00 + 2*i`,
      - `endTime = startTime + requestedHours`.
    - Calls `groupBookingService.finalizeSchedule(bookingId, slots, user.uid)`.
- **Service**: `finalizeSchedule`:
  - Leader enforcement: `leaderId` must match.
  - Validations:
    - \( \text{totalHours} = \sum slots[i].hours \le 12 \).
    - \( \text{totalHours} \le \text{groupBooking.totalDuration} \).
    - Sorts by `startTime`, validates `endTime <= next.startTime` (no overlap).
  - Derives:
    - `startTime` (first slot start).
    - `endTime` (last slot end).
  - Creates `payments` array:
    - `amount = hours * baseHourlyRate`, `paid: false`.
  - Updates `groupBookings/{id}`:
    - `timeSlots`, `startTime`, `endTime`, `payments`,
    - `status: 'waiting_payment'`.

##### 3.3.5 Payment Split & Flow

- **Screen**: `GroupBookingScreen`, when `booking.status === 'waiting_payment'`:
  - Shows each `payments[]` entry with:
    - Farmer label (YOU vs truncated id),
    - Amount,
    - `PAID` / `UNPAID` with color.
  - Current user sees **“Pay My Share”** if they have unpaid entry.
  - Leader sees **“Confirm & Lock Machine”** button enabled only when all payments are marked paid.
- **Service**:
  - `groupBookingService.payShare(bookingId, farmerId, paymentId)`:
    - Ensures booking exists.
    - Finds the user’s `payments` entry, sets `paid = true`, `paymentId`.
    - Returns boolean `allPaid` so UI can show “All members have paid” Alert.

##### 3.3.6 Confirm Group Booking & Machine Lock

- **Screen**: `GroupBookingScreen`, leader presses “Confirm & Lock Machine”.
- `handleConfirmBooking`:
  - Calls `groupBookingService.confirmGPBooking(bookingId)`.
  - Shows either error Alert or success Alert and reloads.
- **Service**: `confirmGPBooking`:
  - Validates:
    - Booking exists.
    - Status is `'waiting_payment'`.
    - All `payments` entries have `paid === true`.
  - Creates **machine-locking booking** in `bookings` via `bookingService.createBooking`:
    - `machineId`, `machineName`, `machineImage`.
    - `rentalStartDate` & `rentalEndDate` = `bookingDate` (single-day).
    - `timeSlot` = `${startTime}-${endTime}`.
    - `totalDays = 1`.
    - `bookingType = 'group'`.
    - `groupBookingId = bookingId`.
    - `needDriver = true`.
    - `deliveryLocation = group.location` (fetched via `groups/{groupId}`).
    - `deliveryTime = startTime`, `pickupTime = endTime`.
    - `totalAmount = totalDuration * baseHourlyRate`.
    - `bookingStatus = 'confirmed'`, `paymentStatus = 'paid'`.
  - Because `bookingService.createBooking` always runs **conflict check** against existing `bookings`, this automatically implements the “no overlap” rule across **all** bookings, not just GP.
  - Creates a matching **driver job** in `driverJobs`:
    - Fields: `bookingType: 'group'`, `groupBookingId`, `machineId`, `machineName`,
      `deliveryLocation`, `deliveryTime`, `pickupTime`, `status: 'available'`, `createdAt`.
  - Finally updates `groupBookings/{id}.status = 'confirmed'`.

##### 3.3.7 Active / Completion / Cancellation

- **Driver side**:
  - `DriverHomeScreen` uses:
    - `bookingService.subscribeAvailableJobs` → available bookings needing drivers (including group ones, because we mark `needDriver: true`).
    - `driverService.subscribeDriverJobs` → jobs assigned to current driver.
  - `driverService.acceptJob(bookingId, driverUid)`:
    - Updates `bookings/{id}`: `driverId`, `driverStatus: 'accepted'`, `bookingStatus: 'driver_assigned'`, `driverPaymentReserved: true`.
    - Marks driver document as unavailable with `currentBookingId`.
  - `handleMarkComplete` in `DriverHomeScreen`:
    - Sets `bookingStatus = 'completed'` and marks driver available again.
- **Cancellation (`groupBookingService.cancelGPBooking`)**:
  - If status is `'confirmed'`:
    - Finds linked `bookings` where `groupBookingId == bookingId` → marks `bookingStatus: 'cancelled'`.
    - Finds `driverJobs` where `groupBookingId == bookingId` → marks `status: 'cancelled'`.
  - Always sets `groupBookings/{id}.status = 'cancelled'`.
- **Refund logic** for individual bookings resides in `bookingService.cancelBooking`, which calculates `refundPercent` based on proximity to `rentalStartDate` and populates `refundAmount` + `driverCompensation`.

Taken together, these implement the **active**, **completion**, and **post-confirmation cancellation** parts of your spec.

### 4. User Flows by Role

#### 4.1 Farmer (Borrower)

- **Authentication**:
  - Logs in via phone number (Soft login) hooked into `RealAuth.loginWithPhone`.
  - Anonymous Firebase auth session is ensured for Firestore access (`ensureAuth`).
- **Group Management**:
  - `GroupsListScreen` (MyGroupsScreen equivalent):
    - List groups where they are a member.
    - `+ Create` opens modal to:
      - Enter group name, village, district.
      - Location saved with mock lat/lng and radius limit (currently in service; can be extended).
    - “Discover nearby groups”:
      - Fetches non-member groups and (optionally) filters based on radius in services.
      - `Join` triggers `groupService.joinGroup` with Haversine distance check.
    - “View” card tap navigates to `GroupDetailsScreen`.
- **Group Bookings (Member side)**:
  - On `GroupBookingScreen`:
    - Views booking details and machine info.
    - Submits timing requests with validation and limits.
    - After leader finalizes slots:
      - Sees assigned slot and cost.
      - Pays their share (`Pay My Share`) and gets confirmation Alerts.
- **Individual Bookings**:
  - Browses machines via cards (`MachineCard`).
  - Chooses date, time slot, rental hours.
  - Client performs validation + conflict check; then writes booking via `bookingService.createBooking`.
  - Tracks their bookings in My Orders screen (not detailed here but wired to booking service).

#### 4.2 Group Leader

- Everything a normal member can do, plus:
  - On `GroupDetailsScreen`:
    - “Start Group Booking Session”:
      - Opens machine picker & creates `groupBookings` document.
      - Handles errors and shows a loading/status message when machine is tapped.
  - On `GroupBookingScreen`:
    - While `status = 'gathering_requests'`:
      - Sees all member requests.
      - Can move to **Scheduling** once there are requests.
    - While `status = 'scheduling'`:
      - Can auto-generate schedule, which:
        - Validates slot overlaps and duration caps.
        - Computes per-member payments and moves booking to `waiting_payment`.
    - While `status = 'waiting_payment'`:
      - Watches dashboard of who has paid.
      - After all `payments[].paid === true`, leader can press “Confirm & Lock Machine” to:
        - Create the machine-locking entry in `bookings`.
        - Create driver job in `driverJobs`.
        - Mark `groupBookings` as `confirmed`.

#### 4.3 Driver

- **DriverHomeScreen**:
  - Tabs:
    - **Available Jobs** – shows bookings (including GP when `bookingType='group'`) that:
      - need a driver (`needDriver === true`),
      - have no `driverId` yet,
      - and are `confirmed` or `pending`.
      - For GP, cards display:
        - “👥 Group Rental” badge.
        - Central `deliveryLocation` and group `bookingDate`.
        - `deliveryTime → pickupTime`.
    - **My Jobs** – bookings assigned to current driver via `driverService.subscribeDriverJobs`.
  - Accept/Reject:
    - `Accept Job` calls `driverService.acceptJob` (updates both booking and driver availability).
    - `Reject` marks `driverStatus: 'rejected'`.
  - Completion:
    - `Mark as Completed` changes booking status and frees up driver.

#### 4.4 Admin

- Admin screens (e.g. `AdminDashboardScreen`, `AdminMachinesScreen`, `AdminUsersScreen`) are powered by `RealFirestore`:
  - Manage users (activate/deactivate, promote admin).
  - Approve/reject machines and modify machine status.
  - Review bookings analytics (including paid bookings, status-wise views).
  - Monitor `groupBookings` and potentially extend to admin oversight.

### 5. Responsiveness & Common Bug Handling

- **Responsiveness**:
  - Layouts use Flexbox with dynamic columns (e.g. Driver cards change columns by `Dimensions.get('window').width`).
  - Buttons use `TouchableOpacity` with `activeOpacity` and pointer cursors on web where needed.
  - Long lists use `FlatList` with padding and comfortable hit areas.
- **Click non-response issues addressed**:
  - **Machine picker click**:
    - Switched from `Pressable` to `TouchableOpacity` in `GroupDetailsScreen` for web reliability.
    - Added explicit “creating booking” status text and robust error Alerts in `handleCreateBooking`.
  - **Firebase initialization error**:
    - Removed second Firebase app initialization in `RealFirebase.js`.
    - All services now share single `auth`, `db`, and `storage` from `firebase/config.js`, resolving the `initializeFirestore() has already been called with different options` error.
  - **Guarded flows**:
    - Group booking actions verify correct status (`gathering_requests`, `scheduling`, `waiting_payment`) and roles (leader vs member) with human-readable Alerts when misused.

### 6. How to Manually Test the GP Flow (Web or Device)

1. **Setup**
   - Start the app with `npx expo start --web` (or Expo Go for mobile).
   - Ensure you can log in as a farmer (and optionally as driver and admin).
2. **Group creation & joining**
   - Go to **My Groups** (`GroupsListScreen`).
   - Tap `+ Create`, fill group name/village/district, save → expect success Alert and group card.
   - Log in as another farmer (or reuse same for testing) and use **Discover nearby groups**:
     - Join → should see success Alert; re-joining should be blocked.
3. **Create a Group Booking**
   - As leader, open group card (`GroupDetailsScreen`).
   - Tap **Start Group Booking Session**:
     - Machine list appears; tap a machine.
     - Observe inline status text + success Alert.
     - Should navigate to `GroupBookingScreen`.
4. **Member timing requests**
   - With one or more farmers (can simulate with same account for basic test), open the booking.
   - Submit requests:
     - Valid hours produce success Alerts and show in list.
     - Invalid values (empty, 0, >12, total over 12) show specific Alerts.
5. **Move to scheduling & finalize**
   - As leader, on `GroupBookingScreen`:
     - Use **Move to Scheduling**; expect success Alert and status change.
     - Then press **Auto-Generate & Finalize**; expect schedule and payment split plus success Alert.
6. **Payment & confirmation**
   - For each member, press **Pay My Share**; success Alerts appear.
   - After all show as PAID, leader’s **Confirm & Lock Machine** becomes clickable:
     - Press to create `bookings` entry & driver job; expect success Alert.
7. **Driver portal**
   - As driver, open **DriverHomeScreen**:
     - In **Available Jobs**, you should see the group job card:
       - BookingType “👥 Group Rental”, central location, date, time range, and total amount.
     - Accept job, then mark it as completed.
8. **Admin & data verification**
   - In admin views (if wired into navigation):
     - Check `bookings`, `groupBookings`, and `driverJobs` documents align with expectations:
       - Group booking confirmed, bookings entry present with `bookingType='group'`, driver job either available, assigned, or completed based on driver actions.

This report reflects the current end-to-end implementation after fixes to the group booking flow, leader-only controls, conflict checks, and driver job linkage. It should serve as a reference for future contributors and as validation against the original GP spec you provided.

