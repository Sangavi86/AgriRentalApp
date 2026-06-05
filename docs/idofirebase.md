# Firebase Integration Guide (Beginner) 🔥

This guide will help you connect your AgriRental App to a real Firebase backend to store data and handle users for free.

## Step 1: Create a Firebase Project
1.  Go to [firebase.google.com](https://firebase.google.com/) and sign in with your Google account.
2.  Click **"Go to Console"** (top right).
3.  Click **"Add project"**.
4.  Name it (e.g., `AgriRental-Live`).
5.  Disable Google Analytics (for simplicity) and click **"Create Project"**.

## Step 2: Register Your App
1.  In the Firebase Console dashboard, look for the icons like iOS, Android, Web (`</>`).
2.  Click the **Web** icon (`</>`). (React Native with Expo works best with the Web SDK).
3.  Nickname your app: `AgriRentalApp`.
4.  Click **"Register app"**.
5.  You will see a code block with `firebaseConfig`. **Keep this open.**

## Step 3: Add Config to Your Code
1.  Open your project in VS Code.
2.  Navigate to `src/services/RealFirebase.ts`.
3.  You will see a placeholder `firebaseConfig` object.
4.  Copy the keys from the Firebase Console (apiKey, authDomain, etc.) and paste them into your file.

```typescript
// src/services/RealFirebase.ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

## Step 4: Enable Features (in Console)

### Authentication (Login)
1.  Go to **Build > Authentication** in the sidebar.
2.  Click **"Get started"**.
3.  Select **"Phone"** (since your app uses Phone Auth) or **"Email/Password"** for easier testing initially.
4.  Enable it and click **Save**.

### Firestore Database (Data)
1.  Go to **Build > Firestore Database**.
2.  Click **"Create Database"**.
3.  Choose **Test Mode** (allows read/write for 30 days, easier for development).
4.  Select a location close to you (e.g., `asia-south1`).
5.  Click **Enable**.

### Storage (Images)
1.  Go to **Build > Storage**.
2.  Click **"Get started"**.
3.  Choose **Test Mode**.
4.  Click **Done**.

## Step 5: Switch App to Real Firebase
1.  Currently, the app uses `MockFirebase.ts`.
2.  To use real data, you will need to update `AuthContext.tsx` and screens to call functions from `RealFirebase.ts` instead of `MockFirebase.ts`.
3.  Start by replacing one feature, like "Login", and test it.

## Free Plan Limits (Spark Plan)
-   **Database**: 1 GB stored, 50k reads/day (Plenty for starting).
-   **Auth**: 10k verifications/month (Phone auth has limits, Email is unlimited).
-   **Storage**: 5 GB.
