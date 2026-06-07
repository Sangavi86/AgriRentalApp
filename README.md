# 🚜 FarmEquipConnect (AgriRental)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Production--Ready-brightgreen)](https://github.com/Sangeetha-Vish/AgriRentalApp)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android%20%7C%20Web-blue.svg)](https://expo.dev)

**FarmEquipConnect** is a premium, high-performance agricultural machinery rental platform designed to bridge the gap between farmers and equipment owners. Built with a focus on **Ultra-UX**, the application features a sophisticated "Forest & Cream" design system with fluid animations and real-time synchronization.

---

## ✨ Key Features & "Wow" Factor

### 🎨 Premium Design System (Ultra-UX)
- **Forest & Cream UI**: A custom-tailored color palette (#1A4D3A & #FDFBF6) that feels organic, professional, and high-end.
- **Micro-Interactions**: Magnetic button pulls, cursor-aware spotlight glows, and 3D parallax tilt effects for a tactile feel.
- **Glassmorphic Headers**: Sticky headers with 12px backdrop blur for a modern, sophisticated layered look.
- **Fluid Transitions**: Staggered entry animations and 60FPS transitions optimized for mobile and web.

### ⚙️ Technical Core
- **Real-Time Sync**: Powered by **Firebase Firestore**, ensuring bookings and equipment availability are updated instantly across all devices.
- **Secure Payments**: Specialized integration with **Razorpay** for seamless, trusted financial transactions.
- **Smart GPS Tracking**: Built-in mock GPS services for tracking machine locations (ready for live integration).
- **Responsive Layouts**: Meticulously designed to scale from compact mobile screens (320px) to ultra-wide 4K monitors (3840px).

---

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo, React Navigation, Styled Components.
- **Backend / BaaS**: Firebase (Auth, Firestore, Storage).
- **Payments**: Razorpay Integration.
- **Animations**: Expo Linear Gradient, Native Animation APIs.
- **Tools**: VS Code, Git, Prettier, ESLint.

---

## 🏗️ Architecture & Security

The project follows a clean, modular service-based architecture:
- `src/frontend`: UI components, screens, and custom themes.
- `src/backend`: Services for Firebase, Payments, and Business logic.
- **Security First**: 
  - Implementation of **Environment Variables** for all sensitive API keys.
  - Robust **Firestore Security Rules** to protect user data.
  - Anonymous and authenticated auth flows integrated.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo Go app on your mobile device (to test native)

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Sangavi86/AgriRentalApp.git
    cd AgriRentalApp
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Setup Environment Variables:**
    - Rename `.env.example` to `.env`.
    - Add your Firebase and Razorpay credentials.
4.  **Start the application:**
    ```bash
    npm start
    ```

---

## 📂 Documentation
The repository includes extensive development documentation for deep-dives:
- [Premium UX Specifications](./docs/PREMIUM_UX_ENHANCEMENTS.md)
- [Architecture & Reference Guide](./docs/CODE_REFERENCE_GUIDE.md)
- [Implementation Roadmap](./docs/IMPLEMENTATION_SUMMARY.md)

---

## 👨‍💻 Author
**Sangavi N**  
*Passionate Full-Stack Developer creating digital solutions for real-world problems.*

---

*Note: This project was built with a vision to revolutionize agricultural logistics through modern design and robust engineering.*
