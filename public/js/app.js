/**
 * Barbell Plate Calculator — v1
 * Pure Vanilla JavaScript calculation logic and UI controller.
 */

// Internal scaling factor to avoid floating-point inaccuracies
const SCALE = 2; // 45 lb => 90 units, 2.5 lb => 5 units

// Bar configurations (built-in defaults)
const DEFAULT_BARS = [
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

const bars = DEFAULT_BARS;

// Storage keys
const STORAGE_KEYS = {
  CUSTOM_BARS: "platecalc_custom_bars",
  LAST_BAR: "platecalc_last_bar"
};

/**
 * Safe storage wrapper to prevent exceptions in private browsing or restricted environments.
 */
const safeStorage = {
  get(key, fallback = null) {
    if (typeof localStorage === "undefined") return fallback;
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : fallback;
    } catch {
      return fallback;
    }
  },
  getJSON(key, fallback = null) {
    const raw = this.get(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    if (typeof localStorage === "undefined") return false;
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.warn(`Storage write failed for key "${key}":`, e);
      return false;
    }
  }
};

/**
 * EquipmentStore: Deep module providing equipment management and persistence.
 */
const EquipmentStore = {
  getBuiltIn() {
    return DEFAULT_BARS;
  },

  getCustom() {
    return safeStorage.getJSON(STORAGE_KEYS.CUSTOM_BARS, []) || [];
  },

  saveCustom(customBars) {
    safeStorage.set(STORAGE_KEYS.CUSTOM_BARS, customBars);
  },

  getAll() {
    return [...this.getBuiltIn(), ...this.getCustom()];
  },

  getById(id) {
    return this.getAll().find(b => b.id === id) || null;
  },

  add({ name, weight }) {
    const trimmedName = (name || "").trim();
    const numWeight = parseFloat(weight);
    if (!trimmedName) {
      throw new Error("Please enter an equipment name.");
    }
    if (isNaN(numWeight) || numWeight <= 0) {
      throw new Error("Please enter a valid starting weight greater than 0.");
    }
    const id = "custom_" + Date.now();
    const newBar = {
      id,
      name: trimmedName,
      shortName: trimmedName,
      label: `${trimmedName} — ${numWeight} lb`,
      weight: numWeight,
      isCustom: true
    };
    const list = this.getCustom();
    list.push(newBar);
    this.saveCustom(list);
    return newBar;
  },

  delete(id) {
    const list = this.getCustom();
    const updated = list.filter(b => b.id !== id);
    this.saveCustom(updated);
    return updated;
  },

  getLastSelectedId() {
    return safeStorage.get(STORAGE_KEYS.LAST_BAR, "straight");
  },

  setLastSelectedId(id) {
    safeStorage.set(STORAGE_KEYS.LAST_BAR, id);
  }
};

// Aliases for backward compatibility with existing tests
function getCustomBars() { return EquipmentStore.getCustom(); }
function saveCustomBars(bars) { return EquipmentStore.saveCustom(bars); }
function getAllBars() { return EquipmentStore.getAll(); }
function addCustomBar(data) { return EquipmentStore.add(data); }
function deleteCustomBar(id) { return EquipmentStore.delete(id); }

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
    EquipmentStore,
    safeStorage,
    STORAGE_KEYS,
    DEFAULT_BARS,
    bars,
    plates,
    getPlateDef,
    getPlateBreakdown,
    calculatePlateLoad,
    SCALE,
    getCustomBars,
    saveCustomBars,
    getAllBars,
    addCustomBar,
    deleteCustomBar
  };
}

// Browser UI Controller
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initApp);
}

function initApp() {
  const controlsCard = document.querySelector(".controls-card");
  const dropdownContainer = document.getElementById("bar-dropdown-container");
  const dropdownTrigger = document.getElementById("bar-dropdown-trigger");
  const dropdownMenu = document.getElementById("bar-dropdown-menu");
  const dropdownOptionsList = document.getElementById("bar-options-list");
  const dropdownCurrentName = document.getElementById("dropdown-current-name");
  const dropdownCurrentWeight = document.getElementById("dropdown-current-weight");
  const openAddModalBtn = document.getElementById("open-add-modal-btn");

  const barSelect = document.getElementById("bar-select");
  const targetInput = document.getElementById("target-weight");
  const stepUpBtn = document.getElementById("step-up-btn");
  const stepDownBtn = document.getElementById("step-down-btn");
  const calcForm = document.getElementById("calc-form");
  const resultsContainer = document.getElementById("results-container");
  const emptyState = document.getElementById("empty-state");
  const errorContainer = document.getElementById("error-container");

  // Modal elements
  const addModal = document.getElementById("add-equipment-modal");
  const addForm = document.getElementById("add-equipment-form");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const newEquipNameInput = document.getElementById("new-equip-name");
  const newEquipWeightInput = document.getElementById("new-equip-weight");
  const modalErrorMsg = document.getElementById("modal-error-msg");

  // Cached output and breakdown DOM elements
  const errorMessageEl = document.getElementById("error-message");
  const errorClosestEl = document.getElementById("error-closest");
  const resBarNameEl = document.getElementById("res-bar-name");
  const resSideWeightEl = document.getElementById("res-side-weight");
  const barbellLeftContainer = document.getElementById("barbell-plates-left");
  const barbellRightContainer = document.getElementById("barbell-plates-right");
  const barbellEl = document.getElementById("barbell-visual");
  const breakdownList = document.getElementById("breakdown-list");
  const breakdownTotalPlates = document.getElementById("breakdown-total-plates");
  const loadedPerSideEl = document.getElementById("summary-loaded-per-side");
  const barWeightEl = document.getElementById("summary-bar-weight");
  const totalWeightEl = document.getElementById("summary-total-weight");

  let currentBarId = EquipmentStore.getLastSelectedId();
  if (!EquipmentStore.getById(currentBarId)) {
    currentBarId = "straight";
  }

  function getSelectedBar() {
    return EquipmentStore.getById(currentBarId) || EquipmentStore.getBuiltIn()[0];
  }

  function updateTriggerDisplay(bar) {
    if (dropdownCurrentName) dropdownCurrentName.textContent = bar.name;
    if (dropdownCurrentWeight) dropdownCurrentWeight.textContent = `${bar.weight} lb`;
  }

  function renderDropdown() {
    const allBars = EquipmentStore.getAll();
    const selectedBar = getSelectedBar();
    updateTriggerDisplay(selectedBar);

    if (dropdownOptionsList) {
      dropdownOptionsList.innerHTML = "";
      allBars.forEach(bar => {
        const option = document.createElement("div");
        option.className = `dropdown-option ${bar.id === currentBarId ? "selected" : ""}`;
        option.setAttribute("role", "option");
        option.setAttribute("tabindex", "0");
        option.setAttribute("aria-selected", bar.id === currentBarId ? "true" : "false");
        option.setAttribute("data-bar-id", bar.id);

        const leftDiv = document.createElement("div");
        leftDiv.className = "option-left";
        leftDiv.innerHTML = `
          <svg class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span class="option-name"></span>
        `;
        leftDiv.querySelector(".option-name").textContent = bar.name;

        const rightDiv = document.createElement("div");
        rightDiv.className = "option-right";

        if (bar.isCustom) {
          const customBadge = document.createElement("span");
          customBadge.className = "option-custom-badge";
          customBadge.textContent = "Custom";
          rightDiv.appendChild(customBadge);
        }

        const wtBadge = document.createElement("span");
        wtBadge.className = "option-weight";
        wtBadge.textContent = `${bar.weight} lb`;
        rightDiv.appendChild(wtBadge);

        if (bar.isCustom) {
          const delBtn = document.createElement("button");
          delBtn.type = "button";
          delBtn.className = "option-delete-btn";
          delBtn.setAttribute("aria-label", `Delete ${bar.name}`);
          delBtn.setAttribute("title", `Delete ${bar.name}`);
          delBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          `;
          delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (confirm(`Remove "${bar.name}" from your equipment?`)) {
              EquipmentStore.delete(bar.id);
              if (currentBarId === bar.id) {
                selectBar("straight");
              } else {
                renderDropdown();
              }
            }
          });
          rightDiv.appendChild(delBtn);
        }

        option.appendChild(leftDiv);
        option.appendChild(rightDiv);

        option.addEventListener("click", () => {
          selectBar(bar.id);
          closeDropdown();
        });

        option.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            selectBar(bar.id);
            closeDropdown();
          }
        });

        dropdownOptionsList.appendChild(option);
      });
    }

    // Populate fallback select for accessibility
    if (barSelect) {
      barSelect.innerHTML = "";
      allBars.forEach(bar => {
        const option = document.createElement("option");
        option.value = bar.id;
        option.textContent = `${bar.name} (${bar.weight} lb)`;
        barSelect.appendChild(option);
      });
      barSelect.value = currentBarId;
    }
  }

  function selectBar(barId) {
    if (!EquipmentStore.getById(barId)) {
      barId = "straight";
    }
    currentBarId = barId;
    EquipmentStore.setLastSelectedId(barId);
    renderDropdown();
    calculate();
  }

  function openDropdown() {
    if (!dropdownContainer || !dropdownMenu) return;
    dropdownContainer.classList.add("open");
    dropdownMenu.classList.remove("hidden");
    if (controlsCard) controlsCard.classList.add("has-dropdown-open");
    if (dropdownTrigger) dropdownTrigger.setAttribute("aria-expanded", "true");
  }

  function closeDropdown() {
    if (!dropdownContainer || !dropdownMenu) return;
    dropdownContainer.classList.remove("open");
    dropdownMenu.classList.add("hidden");
    if (controlsCard) controlsCard.classList.remove("has-dropdown-open");
    if (dropdownTrigger) dropdownTrigger.setAttribute("aria-expanded", "false");
  }

  function toggleDropdown() {
    const isOpen = dropdownContainer && dropdownContainer.classList.contains("open");
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  if (dropdownTrigger) {
    dropdownTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  // Click outside to close dropdown
  document.addEventListener("click", (e) => {
    if (dropdownContainer && !dropdownContainer.contains(e.target)) {
      closeDropdown();
    }
  });

  // Esc key closes dropdown or modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdown();
      closeModal();
    }
  });

  // Modal event listeners
  function openModal() {
    closeDropdown();
    if (modalErrorMsg) {
      modalErrorMsg.textContent = "";
      modalErrorMsg.classList.add("hidden");
    }
    if (newEquipNameInput) newEquipNameInput.value = "";
    if (newEquipWeightInput) newEquipWeightInput.value = "";
    if (addModal) {
      addModal.classList.remove("hidden");
      setTimeout(() => {
        if (newEquipNameInput) newEquipNameInput.focus();
      }, 50);
    }
  }

  function closeModal() {
    if (addModal) {
      addModal.classList.add("hidden");
    }
  }

  if (openAddModalBtn) {
    openAddModalBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal();
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeModal);
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", closeModal);
  }

  if (addModal) {
    addModal.addEventListener("click", (e) => {
      if (e.target === addModal) {
        closeModal();
      }
    });
  }

  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = newEquipNameInput ? newEquipNameInput.value.trim() : "";
      const weight = newEquipWeightInput ? newEquipWeightInput.value.trim() : "";

      try {
        const newBar = EquipmentStore.add({ name, weight });
        closeModal();
        selectBar(newBar.id);
        targetInput.focus();
      } catch (err) {
        if (modalErrorMsg) {
          modalErrorMsg.textContent = err.message;
          modalErrorMsg.classList.remove("hidden");
        }
      }
    });
  }

  // Fallback select change listener
  if (barSelect) {
    barSelect.addEventListener("change", () => {
      selectBar(barSelect.value);
    });
  }

  // Initial render of dropdown
  renderDropdown();

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

    if (resBarNameEl) resBarNameEl.textContent = `${selectedBar.shortName} (${selectedBar.weight} lb)`;
    if (resSideWeightEl) resSideWeightEl.textContent = `${result.weightPerSide} lb per side`;

    // Render barbell visualization
    renderBarbell(result.platesPerSide);

    // Render plate breakdown text
    renderBreakdown(result);
  }

  function renderError(result) {
    if (errorMessageEl) errorMessageEl.textContent = result.message;

    if (errorClosestEl) {
      errorClosestEl.innerHTML = "";
      if (result.closestWeights && result.closestWeights.length > 0) {
        const heading = document.createElement("p");
        heading.className = "closest-heading";
        heading.textContent = "Closest available weights:";
        errorClosestEl.appendChild(heading);

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

        errorClosestEl.appendChild(btnGroup);
      }
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
    if (!barbellLeftContainer || !barbellRightContainer || !barbellEl) return;

    barbellLeftContainer.innerHTML = "";
    barbellRightContainer.innerHTML = "";

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
      barbellRightContainer.appendChild(createPlateElement(weight));
    });

    // Left side: mirrored (2.5 | 5 | 10 | 45 | BAR)
    const reversed = [...platesPerSide].reverse();
    reversed.forEach(weight => {
      barbellLeftContainer.appendChild(createPlateElement(weight));
    });
  }

  function renderBreakdown(result) {
    if (breakdownList) {
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
    }

    if (breakdownTotalPlates) {
      breakdownTotalPlates.textContent = `${result.totalPlatesCount}`;
    }
    if (loadedPerSideEl) {
      loadedPerSideEl.textContent = `${result.weightPerSide} lb`;
    }
    if (barWeightEl) {
      barWeightEl.textContent = `${result.barWeight} lb`;
    }
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
