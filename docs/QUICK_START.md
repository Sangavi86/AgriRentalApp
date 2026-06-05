# AgriRental App - Quick Start Guide

## ⚡ Getting Started in 5 Minutes

### 1. Install Dependencies
```bash
cd c:\Users\sange\MyProjecct\AgriRentalApp
npm install --legacy-peer-deps
```

### 2. Start Development Server
```bash
# For Web
npm run web

# For Android Emulator
expo start --android

# For iOS (Mac only)
expo start --ios
```

### 3. Open Browser
Navigate to: `http://localhost:19006` (for Expo Web)

---

## 🧪 Test Account Credentials

### Admin User
- **Phone**: `9999999999`
- **Role**: Admin (automatic)
- **Access**: All admin screens

### Test Farmer
- **Phone**: `9876543210`
- **Role**: Select "Farmer" on role screen
- **Access**: FarmerHome, AddMachine, FarmerBookings

### Test Driver
- **Phone**: `9111111111`
- **Role**: Select "Driver" on role screen
- **Access**: DriverHome, DriverSchedule

---

## 📋 Testing Workflow

### Quick Test Flow (5-10 minutes)
1. **Login** → Use any phone number
2. **Select Role** → Choose Farmer
3. **View Machines** → See only approved machines
4. **Add Machine** (as Farmer):
   - Name: "Test Tractor"
   - Type: "Tractor"
   - Rate: "800"
   - Description: "Test machine"
   - Submit

5. **Login as Admin** → Use 9999999999
6. **Approve Machine** → Go to AdminMachinesScreen, approve
7. **Login as Farmer** → See newly approved machine
8. **Book Machine**:
   - Select duration: 5 hours
   - Add driver? (toggle)
   - Tap "Book Now"
   - Simulate Payment
   - Upload Video

9. **View Booking** → FarmerBookingsScreen shows confirmation

---

## 🔐 Key Features to Test

### By Phase

#### Phase 1 - Database
- [ ] New user has `role: null`
- [ ] Role selection persists
- [ ] Admin only via 9999999999
- [ ] Machine shows pending until approved
- [ ] Booking created with correct fields

#### Phase 2 - Navigation
- [ ] Admin sees admin screens only
- [ ] Farmer sees farmer screens
- [ ] Logout and re-login keeps role

#### Phase 3 - Admin Panel
- [ ] AdminDashboard shows real stats
- [ ] AdminUsers can filter and toggle status
- [ ] AdminMachines can approve/reject
- [ ] AdminBookings can cancel
- [ ] AdminPayments shows real revenue

#### Phase 4 - Booking
- [ ] Price calculation is dynamic
- [ ] Driver fee (+₹200) works
- [ ] Booking creation succeeds

#### Phase 5 - Payment
- [ ] Payment dialog appears
- [ ] Can simulate payment
- [ ] Booking marked as paid

#### Phase 6 - Video
- [ ] VideoHandshake screen appears
- [ ] Upload button works
- [ ] Redirects after upload

#### Phase 7 - Real Data
- [ ] No hardcoded arrays
- [ ] All data from Firestore
- [ ] Real-time updates work

---

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Kill process on port 19006cd functions
firebase deploy --only functions
netstat -ano | findstr 19006
taskkill /PID {PID} /F
```

### App Won't Start
```bash
# Clear cache
rm -r node_modules
npm install --legacy-peer-deps
npm start
```

### Firestore Not Loading
- Check Firebase config in `src/services/RealFirebase.js`
- Verify internet connection
- Check Firebase Console for errors

### Login Not Working
- Check browser console for errors
- Verify Firestore rules are deployed
- Check admin 9999999999 exists in Firestore

---

## 📁 Key Files to Review

| Purpose | File |
|---------|------|
| Database Logic | `src/services/RealFirebase.js` |
| Authentication | `src/services/AuthContext.jsx` |
| Navigation | `src/navigation/AppNavigator.jsx` |
| Admin Dashboard | `src/screens/AdminDashboardScreen.jsx` |
| Machine Booking | `src/screens/MachineDetailScreen.jsx` |
| Testing Guide | `TESTING_GUIDE.md` |
| Implementation Details | `IMPLEMENTATION_SUMMARY.md` |

---

## 📊 Phase Completion Status

```
✅ Phase 1: Database Restructuring - COMPLETE
✅ Phase 2: Admin Navigation - COMPLETE
✅ Phase 3: Admin Panel - COMPLETE
✅ Phase 4: Booking Flow - COMPLETE
✅ Phase 5: Payment Integration - COMPLETE
✅ Phase 6: Video Storage - COMPLETE
✅ Phase 7: Mock Removal - COMPLETE

🎯 Overall Status: PRODUCTION READY
```

---

## 🚀 Next Steps After Testing

1. **Deploy Cloud Functions**
   ```bash
   cd functions
   firebase deploy --only functions
   ```

2. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Configure Production Environment**
   - Update Razorpay keys (server-side only)
   - Enable production mode
   - Configure email notifications

4. **Launch on App Stores**
   - Build APK for Android
   - Build IPA for iOS
   - Submit for review

---

## 📞 Support & Resources

### Documentation Files
- `TESTING_GUIDE.md` - Comprehensive test cases
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `CURRENT_STATUS_AgriRental.md` - Feature status

### Firebase Console
- Project ID: `agrirental-live`
- Region: Auto
- Database: Firestore

### Common Commands
```bash
# View console logs
expo logs

# Rebuild
npm run web

# Deploy
firebase deploy

# Firestore
firebase firestore:delete {collection}
```

---

## ⏱️ Estimated Testing Time

- **Quick Smoke Test**: 10 minutes
- **Phase-by-Phase Testing**: 2-3 hours
- **Full Regression**: 4-5 hours
- **Performance Testing**: 1-2 hours

---

## ✅ Pre-Launch Checklist

- [ ] All 7 phases tested
- [ ] No console errors
- [ ] Admin accounts created
- [ ] Email notifications enabled
- [ ] Error logging active
- [ ] Performance acceptable
- [ ] Security rules deployed
- [ ] Cloud functions working
- [ ] Backup enabled
- [ ] Analytics configured

---

**Last Updated**: February 26, 2026  
**Status**: Ready for Testing  
**Version**: 1.0.0
