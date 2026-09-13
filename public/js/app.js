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
    shortName: "Straight",
    weight: 45
  },
  {
    id: "trap",
    name: "Trap Bar",
    label: "Trap Bar — 55 lb",
    shortName: "Trap",
    weight: 55
  },
  {
    id: "preacher15",
    name: "EZ Curl Bar — 15 lb",
    label: "EZ Curl / Preacher Bar — 15 lb",
    shortName: "EZ Curl",
    weight: 15
  },
  {
    id: "preacher25",
    name: "EZ Curl Bar — 25 lb",
    label: "EZ Curl / Preacher Bar — 25 lb",
    shortName: "EZ Curl",
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
  const barSegmented = document.getElementById("bar-segmented");
  const barSelect = document.getElementById("bar-select");
  const targetInput = document.getElementById("target-weight");
  const stepUpBtn = document.getElementById("step-up-btn");
  const stepDownBtn = document.getElementById("step-down-btn");
  const calcForm = document.getElementById("calc-form");
  const resultsContainer = document.getElementById("results-container");
  const emptyState = document.getElementById("empty-state");
  const errorContainer = document.getElementById("error-container");

  let currentBarId = localStorage.getItem("platecalc_last_bar") || "straight";
  if (!bars.some(b => b.id === currentBarId)) {
    currentBarId = "straight";
  }

  // Populate Segmented Bar Control
  if (barSegmented) {
    barSegmented.innerHTML = "";
    bars.forEach(bar => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `segmented-pill ${bar.id === currentBarId ? "active" : ""}`;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", bar.id === currentBarId ? "true" : "false");
      btn.setAttribute("data-bar-id", bar.id);

      const nameSpan = document.createElement("span");
      nameSpan.className = "pill-name";
      nameSpan.textContent = bar.shortName;

      const wtSpan = document.createElement("span");
      wtSpan.className = "pill-weight";
      wtSpan.textContent = `${bar.weight} lb`;

      btn.appendChild(nameSpan);
      btn.appendChild(wtSpan);

      btn.addEventListener("click", () => {
        selectBar(bar.id);
      });

      barSegmented.appendChild(btn);
    });
  }

  // Populate fallback select for accessibility
  if (barSelect) {
    barSelect.innerHTML = "";
    bars.forEach(bar => {
      const option = document.createElement("option");
      option.value = bar.id;
      option.textContent = bar.label;
      barSelect.appendChild(option);
    });
    barSelect.value = currentBarId;
    barSelect.addEventListener("change", () => {
      selectBar(barSelect.value);
    });
  }

  function selectBar(barId) {
    currentBarId = barId;
    localStorage.setItem("platecalc_last_bar", barId);

    if (barSegmented) {
      barSegmented.querySelectorAll(".segmented-pill").forEach(btn => {
        const isActive = btn.getAttribute("data-bar-id") === barId;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-checked", isActive ? "true" : "false");
      });
    }

    if (barSelect) {
      barSelect.value = barId;
    }

    calculate();
  }

  // Stepper Adjusters
  function adjustWeight(delta) {
    const raw = targetInput.value.trim();
    const current = raw === "" ? getSelectedBar().weight : parseFloat(raw);
    let next = isNaN(current) ? getSelectedBar().weight : current + delta;
    if (next < 0) next = 0;
    targetInput.value = next;
    calculate();
    targetInput.focus();
  }

  if (stepUpBtn) {
    stepUpBtn.addEventListener("click", () => adjustWeight(5));
  }
  if (stepDownBtn) {
    stepDownBtn.addEventListener("click", () => adjustWeight(-5));
  }

  // Prevent double-tap zoom on iOS Safari when tapping buttons rapidly
  document.addEventListener("dblclick", (e) => {
    e.preventDefault();
  }, { passive: false });

  // Target input events
  targetInput.addEventListener("input", calculate);

  if (calcForm) {
    calcForm.addEventListener("submit", (e) => {
      e.preventDefault();
      calculate();
    });
  }

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
    return bars.find(b => b.id === currentBarId) || bars[0];
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

    // Update headline text
    const targetEl = document.getElementById("res-target-weight");
    if (targetEl) targetEl.textContent = result.targetWeight;

    const barNameEl = document.getElementById("res-bar-name");
    if (barNameEl) barNameEl.textContent = `${selectedBar.shortName} (${selectedBar.weight} lb)`;

    const sideWeightEl = document.getElementById("res-side-weight");
    if (sideWeightEl) sideWeightEl.textContent = `${result.weightPerSide} lb per side`;

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
      emptyNotice.className = "breakdown-empty-text";
      emptyNotice.textContent = "Bar only (0 plates)";
      breakdownList.appendChild(emptyNotice);
    } else {
      result.breakdown.forEach(item => {
        const li = document.createElement("li");
        li.className = "breakdown-badge";

        const dot = document.createElement("span");
        dot.className = `plate-dot plate-dot-${item.plateDef.color}`;

        const text = document.createElement("span");
        text.innerHTML = `<strong>${item.weight}</strong>&times;${item.count}`;

        li.appendChild(dot);
        li.appendChild(text);
        breakdownList.appendChild(li);
      });
    }

    if (breakdownTotalPlates) {
      breakdownTotalPlates.textContent = `${result.totalPlatesCount}`;
    }

    const loadedPerSideEl = document.getElementById("summary-loaded-per-side");
    if (loadedPerSideEl) {
      loadedPerSideEl.textContent = `${result.weightPerSide} lb`;
    }

    const barWeightEl = document.getElementById("summary-bar-weight");
    if (barWeightEl) {
      barWeightEl.textContent = `${result.barWeight} lb`;
    }

    const totalWeightEl = document.getElementById("summary-total-weight");
    if (totalWeightEl) {
      totalWeightEl.textContent = `${result.targetWeight} lb`;
    }
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
