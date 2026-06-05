# Firestore Index Setup

## Required Composite Indexes

The app uses real-time listeners (`onSnapshot`) that require composite indexes in Firestore for efficient filtering and ordering.

### Index 1: Bookings Collection – ownerId + createdAt

**Collection:** `bookings`

**Fields:**
- `ownerId` (Ascending)
- `createdAt` (Descending)

**Purpose:** Lists all bookings received by a renter (My Rentals screen).

**Query:**
```javascript
query(bookingsRef, where('ownerId', '==', userId), orderBy('createdAt', 'desc'))
```

### How to Create the Index Manually

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the project: **agrirental-live**
3. Navigate to **Firestore Database** > **Indexes**
4. Click **Create Index**
5. Fill in:
   - **Collection ID:** `bookings`
   - **Fields:** 
     - `ownerId` (Ascending)
     - `createdAt` (Descending)
6. Click **Create**

Alternatively, copy the link from the error message in the console and follow the auto-generated setup.

### Index 2: Bookings Collection – borrowerId + createdAt

**Collection:** `bookings`

**Fields:**
- `borrowerId` (Ascending)
- `createdAt` (Descending)

**Purpose:** Lists all orders placed by a borrower (My Orders screen).

**Query:**
```javascript
query(bookingsRef, where('borrowerId', '==', userId), orderBy('createdAt', 'desc'))
```

### Status

- [x] Index 1 (ownerId + createdAt) – Required for My Rentals
- [x] Index 2 (borrowerId + createdAt) – Required for My Orders

Index creation typically takes 2-5 minutes. Refresh the Firebase console to check status.

### Alternative: Automatic Index Creation

Firestore will automatically suggest and create indexes when you encounter the `requires an index` error. Simply click the link in the error message to auto-create the index.

---

**Note:** The app will function normally after indexes are created. Real-time updates (onSnapshot) will be fast and efficient.
