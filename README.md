# Barbell Plate Calculator

> *Sometimes I'm too tired to do math.*

A fast, lightweight, mobile-friendly barbell plate calculator built with zero dependencies, no build steps, and no frameworks—just vanilla HTML, CSS, and JavaScript.

Designed for real-world gym use on phones or desktops to eliminate math mistakes when loading the bar.

---

## Features

- **Instant Auto-Calculation**: Updates dynamically as you type your target weight or switch bar types.
- **Symmetric Plate Breakdown**: Uses a greedy plate selection algorithm (fewest, largest plates first) with internal half-pound unit scaling to eliminate floating-point precision issues.
- **Visual Barbell Rendering**: CSS-rendered barbell with realistic sleeve collars and color-coded plates mirrored on both sides (`BAR | 45 | 10 | 5 | 2.5` on the right, mirrored on the left).
- **Gym-Ready Mobile UI**: Responsive design tailored for 320px+ viewports without horizontal scrolling. Plate widths scale smoothly under heavy loads.
- **Detailed Plate Breakdown**: Lists exact plate counts per side, per-side load, bar weight, total plate count, and total weight.
- **Smart Validation & Suggestions**:
  - Warns if the target weight is below the bar weight.
  - Warns if a weight cannot be loaded symmetrically with available plates (e.g., 47 lb on a 45 lb bar) and provides one-tap shortcut buttons for the closest available weights.
- **Quick Weight Presets**: One-tap buttons for common gym milestones (95, 135, 185, 225, 275, 315, 365, 405 lb).
- **Persistent Preferences**: Saves your last selected bar to `localStorage`.
- **Completely Offline & Self-Contained**: Opens directly in any browser with zero setup.

---

## Supported Equipment

### Bars
| Bar | Weight | Notes |
| :--- | :--- | :--- |
| **Straight Bar** | 45 lb | Standard Olympic barbell |
| **Trap Bar** | 55 lb | Standard hex / trap bar |
| **EZ Curl / Preacher Bar** | 15 lb | Lightweight curl bar |
| **EZ Curl / Preacher Bar** | 25 lb | Standard curl bar |

### Plates
| Weight | Color | Height | Thickness |
| :--- | :--- | :--- | :--- |
| **45 lb** | Blue | Tall (130px) | Thick (22px) |
| **35 lb** | Yellow | Tall (130px) | Medium (16px) |
| **25 lb** | Green | Tall (130px) | Thin (10px) |
| **10 lb** | White | Short (80px) | Thick (22px) |
| **5 lb** | Blue | Short (80px) | Medium (16px) |
| **2.5 lb** | Green | Short (80px) | Thin (10px) |

---

## Project Structure

```
platecalc/
├── public/               # Document root for web servers (Apache, Nginx, serve)
│   ├── index.html        # Semantic HTML structure & accessible controls
│   ├── css/
│   │   └── styles.css    # Dark-theme styles, responsive barbell & plate rendering
│   └── js/
│       └── app.js        # Core math, greedy selection, DOM controller & localStorage
├── test/
│   └── calc.test.js      # Unit test suite verifying all acceptance criteria
├── package.json          # Development scripts (serve, test)
└── README.md
```

---

## Local Development & Hosting

### Local Development using `serve`
Run locally using `serve`:

```bash
# Using npm script (runs npx serve public)
npm start
# or
npm run dev

# Or directly with npx
npx serve public
```

### Static File Opening
You can also open the file directly in any browser:

```bash
open public/index.html
```

### Web Server Deployment (Apache, Nginx, etc.)
Point your web server's document root to the `public/` directory:

- **Apache `DocumentRoot`**: `/path/to/platecalc/public`
- **Nginx `root`**: `/path/to/platecalc/public;`

---

## Install to Home Screen (PWA)

PlateCalc is a Progressive Web App (PWA) with offline caching and home screen icon support:

### iOS (iPhone/iPad — Safari)
1. Open the app in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. The app will now launch full-screen from your home screen with its custom brain icon, with no Safari browser bars.

### Android (Chrome)
1. Open the app in **Chrome**.
2. Tap the **three-dot menu** in the top-right corner.
3. Tap **Add to Home screen** (or **Install app**).
4. Tap **Install**.

Once installed, it works 100% offline at the gym without cell signal or WiFi.

---

## Testing

Run the automated test suite with Node.js:

```bash
npm test
```

