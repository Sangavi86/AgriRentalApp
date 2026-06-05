# Style Guide & Asset Reference (Styledo) 🎨

## Global Theme
**File**: `src/theme/Theme.ts`

### Colors
-   **Navy (Primary)**: `#0A192F` (Deep Blue/Black) - Used for Headers, Buttons, Text.
-   **Gold (Accent)**: `#FFD700` - Used for Highlights, Icons, Links.
-   **Green**: `#2E7D32` - Used for Farmer status, Success states.
-   **White**: `#FFFFFF` - Card backgrounds, Text on dark.

### Typography
-   **Hero**: 32px (Bold)
-   **Title**: 24px (Bold)
-   **Body**: 16px
-   **Small**: 14px

## Background Images 🖼️

The app uses **Dynamic Configuration** for backgrounds. This means you can change them in one place (`ConfigContext.tsx`) or via the **Settings Screen** inside the app.

**File**: `src/services/ConfigContext.tsx`
(See `DEFAULT_CONFIG` object)

| Screen | Config Key | Current Link Location | Description |
| :--- | :--- | :--- | :--- |
| **Login Screen** | `bgLogin` | `src/services/ConfigContext.tsx` (Line 11) | Misty Morning Field |
| **Farmer Home** | `bgFarmerHome` | `src/services/ConfigContext.tsx` (Line 12) | Green Tractor on Field |
| **Driver Home** | `bgDriverHome` | `src/services/ConfigContext.tsx` (Line 13) | Open Highway/Road |
| **OTP Screen** | `bgOtp` | `src/services/ConfigContext.tsx` (Line 14) | Blue Sky |

### How to Change Images
1.  **Ideally**: Open the App -> Login -> Driver Home -> Click Gear Icon (⚙️) -> Paste new URL.
2.  **Permanently**: Edit the `DEFAULT_CONFIG` object in `src/services/ConfigContext.tsx`.

## CSS/Style Tips
-   **Glassmorphism**: We use a `Glass` object in `Theme.ts`.
    -   `Glass.container`: Adds a semi-transparent white background, blur, and border. Use this for premium cards.
    -   `Glass.input`: Used for text inputs to blend with backgrounds.
-   **Shadows**: We use `Shadows.soft` for cards and `Shadows.strong` for floating buttons.

## Important File Locations
-   **Theme Definitions**: `src/theme/Theme.ts`
-   **Configuration/Images**: `src/services/ConfigContext.tsx`
-   **Login Page Styling**: `src/screens/LoginScreen.tsx`
-   **Card Styling**: `src/components/JobCard.tsx` / `MachineCard.tsx`
