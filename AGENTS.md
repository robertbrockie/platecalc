# AGENTS.md — Developer & AI Agent Guide for PlateCalc

This document provides architectural context, design invariants, and operating guidelines for AI assistants and engineers working on **PlateCalc**.

---

## 1. Project Mission & Philosophy

* **Zero Dependencies**: Pure Vanilla HTML5, CSS3, and modern ES6 JavaScript. No frameworks (React, Vue), no utility libraries (Lodash), no preprocessors, and no bundlers (Webpack, Vite).
* **Gym-Ready Mobile First**: Tailored for real-world gym usage on phones (320px+ viewports) with high contrast, large touch targets (44px+), no double-tap zoom, and minimal keystrokes.
* **Offline First & PWA**: 100% functional without cell signal or WiFi inside basements or commercial gyms via Service Worker caching.
* **Mathematical Precision**: Avoids floating-point inaccuracies through scaled integer arithmetic and strict remainder validation.

---

## 2. Codebase Structure

```
platecalc/
├── public/                 # Production document root (served directly)
│   ├── index.html          # Accessible semantic layout & controls
│   ├── css/
│   │   └── styles.css      # Dark glass theme, responsive barbell & animations
│   ├── js/
│   │   └── app.js          # Core calculation math, stores, views & controller
│   ├── sw.js               # Offline service worker cache
│   ├── manifest.json       # PWA web app manifest
│   ├── favicon.svg         # Primary vector icon
│   ├── favicon.png         # 32x32 raster icon
│   ├── apple-touch-icon.png# 180x180 iOS home screen icon
│   ├── icon-192.png        # PWA Android icon
│   └── icon-512.png        # PWA splash icon
├── test/
│   └── calc.test.js        # Zero-dependency Node.js unit test suite
├── package.json            # Dev scripts (start, dev, test)
├── README.md               # User-facing documentation
└── AGENTS.md               # Architecture & invariant specification (this file)
```

---

## 3. Core Architecture & Deep Modules

The application is structured into deep, cohesive modules with minimal public surfaces and encapsulated internal complexity:

### A. Mathematical Engine
* **`calculatePlateLoad(barWeight, targetWeight, availablePlates)`**:
  * Pure functional calculation engine.
  * Dynamically computes the smallest loadable step using greatest common divisor (`gcd`) of plate pair weights in unit space.
  * Evaluates step divisibility in float space (`Math.abs(numSteps - Math.round(numSteps)) > 1e-4`) to reject impossible decimal remainders (`135.1`, `135.25`, etc.).
  * Allocates plates symmetrically per side using a greedy algorithm with scaled half-pound integer units (`SCALE = 2`).
  * Verifies exact match against target (`Math.abs(actualTotal - targetWeight) > 0.001`), returning structured result or error diagnostics with closest loadable weight suggestions.
* **`calculateAdjustedWeight(currentValue, barWeight, delta, maxWeight)`**:
  * Pure stepper arithmetic helper.
  * Empty input ergonomics: tapping `-` on an empty input sets weight to the selected bar itself (e.g. 45 lb, 0 plates) rather than dipping below the bar and triggering an error.
  * Clamps bounds to `[0, maxWeight]` (default max: 2,000 lb).
  * Rounds stepped values to 2 decimal places, eliminating JavaScript float accumulation (e.g., `90.35 + 5 = 95.35`).

### B. Storage & Equipment Persistence
* **`safeStorage`**:
  * Wraps `localStorage` access in `try/catch` to prevent uncaught exceptions in Safari Private Browsing or restricted iframes.
  * Catches `QuotaExceededError` on storage write failures without crashing.
* **`EquipmentStore`**:
  * Manages built-in bars and custom equipment CRUD.
  * In-memory cache (`_customCache`) prevents repetitive `JSON.parse` operations during keystrokes and stepper adjustments.
  * Auto-resets `LAST_BAR` to `"straight"` if the currently selected custom equipment is deleted.
  * Validates and sanitizes data: ensures `getCustom()` strictly returns an array (safeguarding against corrupted non-array storage JSON), strips corrupted items, and sanitizes custom starting weights to 2 decimal places.

### C. Presentation State & Views
* **`CalculatorView`**:
  * Finite state machine managing mutual exclusivity between three primary UI states:
    1. `showEmpty()`: Initial or cleared state.
    2. `showError(result, onSelectWeight)`: Diagnostic error message with closest-weight shortcut buttons.
    3. `showResult(result, selectedBar)`: Barbell sleeve visualization and plate breakdown summary.
  * Coordinates rendering and clearing across child views (`BarbellVisualizer`, `BreakdownView`, `ErrorView`).
* **`BarbellVisualizer`**:
  * Renders plates onto visual barbell sleeves (`BAR | 45 | 10 | 5 | 2.5` on the right sleeve, mirrored on the left).
  * Automatically applies multi-tier dynamic scaling:
    - Normal scale ($\le$ 5 plates per side).
    - Compact scale (`.barbell-compact`, > 5 plates per side).
    - Ultra-compact scale (`.barbell-ultra-compact`, > 8 plates per side, up to 2,000 lb).
  * Batches DOM insertions using `DocumentFragment` to prevent repeated reflows.
* **`BreakdownView`**:
  * Displays per-side plate counts, starting bar weight, per-side load, and total weight.
  * Generates accessible `aria-label` attributes on badges (e.g. `"2 plates of 45 lb"` instead of `"45 × 2"`).
  * Batches badge DOM elements using `DocumentFragment`.
* **`ErrorView`**:
  * Renders error messages and clickable "Load XX lb" shortcut buttons.
* **`EquipmentDropdown`**:
  * Custom accessible combobox/listbox dropdown.
  * Full keyboard navigation: `ArrowDown`, `ArrowUp`, `Home`, `End`, and `Enter`/`Space`.
  * Auto-dismisses on outside clicks and on container `focusout` when tabbing away.
  * Isolates `keydown` events on delete buttons to prevent bubbling up to the option selector.
  * Restores focus to `trigger` upon deleting custom equipment.
* **`EquipmentModal`**:
  * Accessible dialog (`aria-modal="true"`) for adding custom bars/machines.
  * Focus trapping loop (`Tab` and `Shift+Tab`).
  * Manages `_focusTimeout` lifecycle so closing the modal cancels delayed autofocus.

---

## 4. Non-Negotiable Invariants & Rules

When modifying or extending this codebase, adhere strictly to these rules:

1. **Zero Runtime Dependencies**:
   * Do NOT install or import any runtime libraries.
   * `devDependencies` in `package.json` are strictly for local testing and serving (`serve`).
2. **Mobile Keyboard Ergonomics**:
   * Never programmatically focus `targetInput` on touch devices (`pointer: coarse`) during stepper adjustments or clear actions—this prevents the on-screen keyboard from popping up and obstructing the visual bar.
   * On desktop (`!isTouch`), maintain focus after clicks for rapid keyboard interaction.
   * Pressing `Enter` on `targetInput` must call `targetInput.blur()` to dismiss the mobile keyboard.
3. **Double-Tap Zoom Prevention**:
   * Maintain `touch-action: manipulation` on buttons, inputs, and interactive elements.
   * Preserve the `dblclick` default prevention listener in `initApp()`.
4. **Service Worker Cache Bumping**:
   * Whenever files in `public/` (`app.js`, `styles.css`, `index.html`, etc.) are modified, bump `CACHE_NAME` in `public/sw.js` (e.g., `platecalc-v15` -> `platecalc-v16`).
5. **Accessibility (WCAG 2.1 AA)**:
   * Keep `.barbell-stage` marked `aria-hidden="true"`. Sighted users see the dynamic visual bar, while screen readers rely on the formatted text breakdown list below.
   * Maintain descriptive `aria-label` attributes on badge `<li>` items.
   * Keep modal focus trapped while open, and restore focus to the trigger on close.
6. **Testing Verification**:
   * Always run `npm test` after making changes.
   * Ensure all test suites in `test/calc.test.js` pass with 100% success.
   * Write dedicated unit tests for any new edge cases or features.

---

## 5. Development & Testing Commands

```bash
# Run automated Node.js unit tests
npm test

# Start local static server (serves public/)
npm start
# or
npm run dev
```
