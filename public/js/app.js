/**
 * Barbell Plate Calculator — v1
 * Pure Vanilla JavaScript calculation logic and UI controller.
 */

// Internal scaling factor to avoid floating-point inaccuracies
const SCALE = 2; // 45 lb => 90 units, 2.5 lb => 5 units

// Bar configurations
const bars = [
  {
    id: "straight",
    name: "Straight Bar",
    label: "Straight Bar — 45 lb",
    weight: 45
  },
  {
    id: "trap",
    name: "Trap Bar",
    label: "Trap Bar — 55 lb",
    weight: 55
  },
  {
    id: "preacher15",
    name: "EZ Curl Bar — 15 lb",
    label: "EZ Curl / Preacher Bar — 15 lb",
    weight: 15
  },
  {
    id: "preacher25",
    name: "EZ Curl Bar — 25 lb",
    label: "EZ Curl / Preacher Bar — 25 lb",
    weight: 25
  }
];

// Available plate configurations
const plates = [
  {
    weight: 45,
    color: "blue",
    size: "large",
    thickness: "thick",
    available: null
  },
  {
    weight: 35,
    color: "yellow",
    size: "large",
    thickness: "medium",
    available: null
  },
  {
    weight: 25,
    color: "green",
    size: "large",
    thickness: "thin",
    available: null
  },
  {
    weight: 10,
    color: "white",
    size: "small",
    thickness: "thick",
    available: null
  },
  {
    weight: 5,
    color: "blue",
    size: "small",
    thickness: "medium",
    available: null
  },
  {
    weight: 2.5,
    color: "green",
    size: "small",
    thickness: "thin",
    available: null
  }
];

/**
 * Returns plate definition for a given weight
 * @param {number} weight
 * @returns {object|undefined}
 */
function getPlateDef(weight) {
  return plates.find(p => p.weight === weight);
}

/**
 * Calculates the greedy plate breakdown for a given weight per side.
 * @param {number} weightPerSide
 * @returns {number[]} Array of plate weights
 */
function getPlateBreakdown(weightPerSide) {
  let remainingUnits = Math.round(weightPerSide * SCALE);
  const result = [];

  for (const plate of plates) {
    const plateUnits = Math.round(plate.weight * SCALE);
    let count = 0;
    while (remainingUnits >= plateUnits && (plate.available === null || count < plate.available)) {
      result.push(plate.weight);
      remainingUnits -= plateUnits;
      count++;
    }
  }

  return result;
}

/**
 * Validates and calculates plate load for a target weight and bar weight.
 * Returns structured data separating data and logic from DOM rendering.
 *
 * @param {number} barWeight
 * @param {number} targetWeight
 * @returns {object} Result object with valid flag and either data or error reason
 */
function calculatePlateLoad(barWeight, targetWeight) {
  if (typeof targetWeight !== "number" || isNaN(targetWeight)) {
    return {
      valid: false,
      reason: "INVALID_INPUT",
      message: "Please enter a valid target weight."
    };
  }

  const targetUnits = Math.round(targetWeight * SCALE);
  const barUnits = Math.round(barWeight * SCALE);
  const diffUnits = targetUnits - barUnits;

  // 1. Target below bar weight
  if (diffUnits < 0) {
    return {
      valid: false,
      reason: "TARGET_BELOW_BAR",
      barWeight,
      targetWeight,
      message: `Target weight must be at least ${barWeight} lb for this bar.`
    };
  }

  // 2. Bar only (0 plates needed)
  if (diffUnits === 0) {
    return {
      valid: true,
      barWeight,
      targetWeight,
      weightToLoad: 0,
      weightPerSide: 0,
      platesPerSide: [],
      breakdown: [],
      totalPlatesCount: 0
    };
  }

  // 3. Impossible weight check:
  // Smallest plate is 2.5 lb (5 units). Loaded symmetrically, smallest increment is 5 lb (10 units).
  if (diffUnits % 10 !== 0) {
    const stepUnits = 10; // 5 lb * SCALE
    const lowerUnits = barUnits + Math.floor(diffUnits / stepUnits) * stepUnits;
    const upperUnits = barUnits + Math.ceil(diffUnits / stepUnits) * stepUnits;

    const lower = lowerUnits / SCALE;
    const upper = upperUnits / SCALE;

    const closestWeights = [];
    if (lower >= barWeight) {
      closestWeights.push(lower);
    }
    closestWeights.push(upper);

    return {
      valid: false,
      reason: "TARGET_NOT_LOADABLE",
      barWeight,
      targetWeight,
      message: `${targetWeight} lb cannot be loaded exactly with the available plates.`,
      closestWeights
    };
  }

  const weightToLoad = targetWeight - barWeight;
  const weightPerSide = weightToLoad / 2;
  const platesPerSide = getPlateBreakdown(weightPerSide);

  // Verify exact match
  const loadedPerSide = platesPerSide.reduce((sum, w) => sum + w, 0);
  if (Math.round(loadedPerSide * SCALE) !== Math.round(weightPerSide * SCALE)) {
    return {
      valid: false,
      reason: "TARGET_NOT_LOADABLE",
      barWeight,
      targetWeight,
      message: `${targetWeight} lb cannot be loaded exactly with the available plates.`
    };
  }

  // Group plates for breakdown display: e.g. [{ weight: 45, count: 3 }, ...]
  const breakdownMap = new Map();
  for (const w of platesPerSide) {
    breakdownMap.set(w, (breakdownMap.get(w) || 0) + 1);
  }

  const breakdown = [];
  for (const [weight, count] of breakdownMap.entries()) {
    const plateDef = getPlateDef(weight);
    breakdown.push({
      weight,
      count,
      plateDef
    });
  }

  return {
    valid: true,
    barWeight,
    targetWeight,
    weightToLoad,
    weightPerSide,
    platesPerSide,
    breakdown,
    totalPlatesCount: platesPerSide.length * 2
  };
}

// Export for Node testing if in commonjs environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    bars,
    plates,
    getPlateDef,
    getPlateBreakdown,
    calculatePlateLoad,
    SCALE
  };
}

// Browser UI Controller
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initApp);
}

function initApp() {
  const barSelect = document.getElementById("bar-select");
  const targetInput = document.getElementById("target-weight");
  const calcForm = document.getElementById("calc-form");
  const quickWeightContainer = document.getElementById("quick-weights");
  const resultsContainer = document.getElementById("results-container");
  const emptyState = document.getElementById("empty-state");
  const errorContainer = document.getElementById("error-container");

  // Populate bar select dropdown
  barSelect.innerHTML = "";
  bars.forEach(bar => {
    const option = document.createElement("option");
    option.value = bar.id;
    option.textContent = bar.label;
    barSelect.appendChild(option);
  });

  // Restore remembered bar from localStorage
  const savedBarId = localStorage.getItem("platecalc_last_bar");
  if (savedBarId && bars.some(b => b.id === savedBarId)) {
    barSelect.value = savedBarId;
  } else {
    barSelect.value = "straight";
  }

  // Quick weight presets
  const quickWeights = [95, 135, 185, 225, 275, 315, 365, 405];
  quickWeightContainer.innerHTML = "";
  quickWeights.forEach(wt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-chip";
    btn.textContent = `${wt} lb`;
    btn.addEventListener("click", () => {
      targetInput.value = wt;
      calculate();
      targetInput.focus();
    });
    quickWeightContainer.appendChild(btn);
  });

  // Event Listeners
  barSelect.addEventListener("change", () => {
    localStorage.setItem("platecalc_last_bar", barSelect.value);
    calculate();
  });

  targetInput.addEventListener("input", calculate);

  calcForm.addEventListener("submit", (e) => {
    e.preventDefault();
    calculate();
  });

  // Clear button
  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      targetInput.value = "";
      calculate();
      targetInput.focus();
    });
  }

  // Initial calculation check
  calculate();

  function getSelectedBar() {
    return bars.find(b => b.id === barSelect.value) || bars[0];
  }

  function calculate() {
    const rawVal = targetInput.value.trim();
    const selectedBar = getSelectedBar();

    // Default/blank state
    if (rawVal === "") {
      showEmptyState();
      return;
    }

    const targetWeight = parseFloat(rawVal);
    const result = calculatePlateLoad(selectedBar.weight, targetWeight);

    if (!result.valid) {
      showErrorState(result);
    } else {
      showResultState(result, selectedBar);
    }
  }

  function showEmptyState() {
    emptyState.classList.remove("hidden");
    errorContainer.classList.add("hidden");
    resultsContainer.classList.add("hidden");
  }

  function showErrorState(result) {
    emptyState.classList.add("hidden");
    resultsContainer.classList.add("hidden");
    errorContainer.classList.remove("hidden");

    renderError(result);
  }

  function showResultState(result, selectedBar) {
    emptyState.classList.add("hidden");
    errorContainer.classList.add("hidden");
    resultsContainer.classList.remove("hidden");

    // Update summary text
    document.getElementById("res-target-weight").textContent = `${result.targetWeight} LB`;
    document.getElementById("res-bar-name").textContent = `${selectedBar.name} — ${selectedBar.weight} lb`;
    document.getElementById("res-side-weight").textContent = `${result.weightPerSide} lb per side`;

    // Render barbell visualization
    renderBarbell(result.platesPerSide);

    // Render plate breakdown text
    renderBreakdown(result);
  }

  function renderError(result) {
    const messageEl = document.getElementById("error-message");
    const closestEl = document.getElementById("error-closest");
    messageEl.textContent = result.message;

    closestEl.innerHTML = "";
    if (result.closestWeights && result.closestWeights.length > 0) {
      const heading = document.createElement("p");
      heading.className = "closest-heading";
      heading.textContent = "Closest available weights:";
      closestEl.appendChild(heading);

      const btnGroup = document.createElement("div");
      btnGroup.className = "closest-buttons";

      result.closestWeights.forEach(weight => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "closest-btn";
        btn.textContent = `Load ${weight} lb`;
        btn.addEventListener("click", () => {
          targetInput.value = weight;
          calculate();
        });
        btnGroup.appendChild(btn);
      });

      closestEl.appendChild(btnGroup);
    }
  }

  function createPlateElement(weight) {
    const plateDef = getPlateDef(weight);
    const el = document.createElement("div");
    el.className = `plate plate-${plateDef.size} plate-${plateDef.thickness} plate-${plateDef.color}`;
    el.setAttribute("data-weight", weight);
    el.setAttribute("title", `${weight} lb plate`);

    // Inner label
    const label = document.createElement("span");
    label.className = "plate-label";
    label.textContent = weight;
    el.appendChild(label);

    return el;
  }

  function renderBarbell(platesPerSide) {
    const leftContainer = document.getElementById("barbell-plates-left");
    const rightContainer = document.getElementById("barbell-plates-right");
    const barbellEl = document.getElementById("barbell-visual");

    leftContainer.innerHTML = "";
    rightContainer.innerHTML = "";

    // Adjust scale factor if many plates to avoid horizontal overflow on 320px screens
    const plateCount = platesPerSide.length;
    if (plateCount > 5) {
      barbellEl.classList.add("barbell-compact");
    } else {
      barbellEl.classList.remove("barbell-compact");
    }

    if (platesPerSide.length === 0) {
      // Bar only (no plates)
      barbellEl.classList.add("barbell-empty");
      return;
    }
    barbellEl.classList.remove("barbell-empty");

    // Right side: largest -> smallest moving away from center (BAR | 45 | 10 | 5 | 2.5)
    platesPerSide.forEach(weight => {
      rightContainer.appendChild(createPlateElement(weight));
    });

    // Left side: mirrored (2.5 | 5 | 10 | 45 | BAR)
    // platesPerSide is largest to smallest. In plates-left flex layout,
    // we reverse the DOM nodes so largest is adjacent to collar on the right side of the sleeve.
    const reversed = [...platesPerSide].reverse();
    reversed.forEach(weight => {
      leftContainer.appendChild(createPlateElement(weight));
    });
  }

  function renderBreakdown(result) {
    const breakdownList = document.getElementById("breakdown-list");
    const breakdownTotalPlates = document.getElementById("breakdown-total-plates");

    breakdownList.innerHTML = "";

    if (result.platesPerSide.length === 0) {
      const emptyNotice = document.createElement("li");
      emptyNotice.className = "breakdown-empty-item";
      emptyNotice.textContent = "No plates needed (empty bar).";
      breakdownList.appendChild(emptyNotice);
    } else {
      result.breakdown.forEach(item => {
        const li = document.createElement("li");
        li.className = "breakdown-item";

        const dot = document.createElement("span");
        dot.className = `plate-dot plate-dot-${item.plateDef.color}`;

        const text = document.createElement("span");
        text.className = "breakdown-text";
        text.innerHTML = `<strong>${item.weight} lb</strong> × ${item.count}`;

        const subtotal = document.createElement("span");
        subtotal.className = "breakdown-subtotal";
        subtotal.textContent = `(${item.weight * item.count} lb)`;

        li.appendChild(dot);
        li.appendChild(text);
        li.appendChild(subtotal);
        breakdownList.appendChild(li);
      });
    }

    breakdownTotalPlates.textContent = `${result.totalPlatesCount} (${result.platesPerSide.length} per side)`;

    document.getElementById("summary-loaded-per-side").textContent = `${result.weightPerSide} lb`;
    document.getElementById("summary-bar-weight").textContent = `${result.barWeight} lb`;
    document.getElementById("summary-total-weight").textContent = `${result.targetWeight} lb`;
  }

  // Register Service Worker for offline gym use & PWA install
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Silently ignore if served from non-secure context or file://
      });
    });
  }
}

