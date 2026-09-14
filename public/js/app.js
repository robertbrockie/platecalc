/**
 * Barbell Plate Calculator — v1
 * Pure Vanilla JavaScript calculation logic and UI controller.
 */

// Internal scaling factor to avoid floating-point inaccuracies
const SCALE = 2; // 45 lb => 90 units, 2.5 lb => 5 units

// Maximum supported target weight to prevent memory exhaustion and runaway DOM nodes
const MAX_TARGET_WEIGHT = 2000;

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
  _customCache: null,

  getBuiltIn() {
    return DEFAULT_BARS;
  },

  getCustom() {
    if (this._customCache === null) {
      this._customCache = safeStorage.getJSON(STORAGE_KEYS.CUSTOM_BARS, []) || [];
    }
    return this._customCache;
  },

  saveCustom(customBars) {
    this._customCache = customBars;
    safeStorage.set(STORAGE_KEYS.CUSTOM_BARS, customBars);
  },

  clearCache() {
    this._customCache = null;
  },

  getAll() {
    return [...this.getBuiltIn(), ...this.getCustom()];
  },

  getById(id) {
    return this.getAll().find(b => b.id === id) || null;
  },

  add({ name, weight }) {
    const trimmedName = (name || "").trim();
    const numWeight = Math.round(parseFloat(weight) * 100) / 100;
    if (!trimmedName) {
      throw new Error("Please enter an equipment name.");
    }
    if (trimmedName.length > 40) {
      throw new Error("Equipment name cannot exceed 40 characters.");
    }
    if (isNaN(numWeight) || numWeight <= 0) {
      throw new Error("Please enter a valid starting weight greater than 0.");
    }
    if (numWeight > 2000) {
      throw new Error("Starting weight cannot exceed 2,000 lb.");
    }
    const id = "custom_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
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
    if (DEFAULT_BARS.some(b => b.id === id)) {
      return this.getCustom();
    }
    const list = this.getCustom();
    const updated = list.filter(b => b.id !== id);
    this.saveCustom(updated);
    if (this.getLastSelectedId() === id) {
      this.setLastSelectedId("straight");
    }
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
 * @param {Array} [availablePlates=plates]
 * @returns {object|undefined}
 */
function getPlateDef(weight, availablePlates = plates) {
  return availablePlates.find(p => p.weight === weight) || {
    weight,
    color: "gray",
    size: "medium",
    thickness: "medium",
    available: null
  };
}

/**
 * Calculates the greedy plate breakdown for a given weight per side.
 * @param {number} weightPerSide
 * @param {Array} [availablePlates=plates]
 * @returns {number[]} Array of plate weights
 */
function getPlateBreakdown(weightPerSide, availablePlates = plates) {
  let remainingUnits = Math.round(weightPerSide * SCALE);
  const result = [];

  for (const plate of availablePlates) {
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

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function getInventoryStepUnits(availablePlates) {
  if (!availablePlates || availablePlates.length === 0) return 10;
  let g = Math.round(availablePlates[0].weight * 2 * SCALE);
  for (let i = 1; i < availablePlates.length; i++) {
    g = gcd(g, Math.round(availablePlates[i].weight * 2 * SCALE));
  }
  return g > 0 ? g : 10;
}

/**
 * Validates and calculates plate load for a target weight and bar weight.
 * Returns structured data separating data and logic from DOM rendering.
 *
 * @param {number} barWeight
 * @param {number} targetWeight
 * @param {Array} [availablePlates=plates]
 * @returns {object} Result object with valid flag and either data or error reason
 */
function calculatePlateLoad(barWeight, targetWeight, availablePlates = plates) {
  if (typeof barWeight !== "number" || !Number.isFinite(barWeight) || barWeight < 0 || barWeight > MAX_TARGET_WEIGHT) {
    return {
      valid: false,
      reason: "INVALID_BAR_WEIGHT",
      message: "Please select a valid equipment starting weight."
    };
  }

  if (typeof targetWeight !== "number" || !Number.isFinite(targetWeight)) {
    return {
      valid: false,
      reason: "INVALID_INPUT",
      message: "Please enter a valid target weight."
    };
  }

  if (targetWeight > MAX_TARGET_WEIGHT) {
    return {
      valid: false,
      reason: "TARGET_EXCEEDS_MAX",
      barWeight,
      targetWeight,
      message: `Target weight cannot exceed ${MAX_TARGET_WEIGHT} lb.`,
      closestWeights: [MAX_TARGET_WEIGHT]
    };
  }

  const diff = targetWeight - barWeight;

  // 1. Target below bar weight
  if (diff < -1e-6) {
    return {
      valid: false,
      reason: "TARGET_BELOW_BAR",
      barWeight,
      targetWeight,
      message: `Target weight must be at least ${barWeight} lb for this bar.`,
      closestWeights: [barWeight]
    };
  }

  // 2. Bar only (0 plates needed)
  if (Math.abs(diff) <= 1e-6) {
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
  // Dynamically determine smallest loadable increment using GCD of pair weights
  const stepUnits = getInventoryStepUnits(availablePlates);
  const stepWeight = stepUnits > 0 ? stepUnits / SCALE : 5;
  const numSteps = diff / stepWeight;

  if (stepWeight > 0 && Math.abs(numSteps - Math.round(numSteps)) > 1e-4) {
    const lower = barWeight + Math.floor(numSteps) * stepWeight;
    const upper = barWeight + Math.ceil(numSteps) * stepWeight;

    const closestWeights = [];
    if (lower >= barWeight) {
      closestWeights.push(Math.round(lower * 100) / 100);
    }
    closestWeights.push(Math.round(upper * 100) / 100);

    return {
      valid: false,
      reason: "TARGET_NOT_LOADABLE",
      barWeight,
      targetWeight,
      message: `${targetWeight} lb cannot be loaded exactly with the available plates.`,
      closestWeights
    };
  }

  const weightToLoad = Math.round((targetWeight - barWeight) * 100) / 100;
  const weightPerSide = Math.round((weightToLoad / 2) * 100) / 100;
  const platesPerSide = getPlateBreakdown(weightPerSide, availablePlates);

  // Verify exact match
  const loadedPerSide = platesPerSide.reduce((sum, w) => sum + w, 0);
  const actualTotal = Math.round((barWeight + loadedPerSide * 2) * 100) / 100;
  if (Math.abs(actualTotal - targetWeight) > 0.001) {
    const lower = actualTotal;
    const closestWeights = [];
    if (lower >= barWeight) {
      closestWeights.push(lower);
    }
    return {
      valid: false,
      reason: "TARGET_NOT_LOADABLE",
      barWeight,
      targetWeight,
      message: `${targetWeight} lb cannot be loaded exactly with the available plates.`,
      closestWeights
    };
  }

  // Group plates for breakdown display: e.g. [{ weight: 45, count: 3 }, ...]
  const breakdownMap = new Map();
  for (const w of platesPerSide) {
    breakdownMap.set(w, (breakdownMap.get(w) || 0) + 1);
  }

  const breakdown = [];
  for (const [weight, count] of breakdownMap.entries()) {
    const plateDef = getPlateDef(weight, availablePlates);
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

/**
 * Pure calculator for stepper adjustments.
 * Safely increments/decrements weight, clamps to bounds [0, maxWeight],
 * eliminates floating-point accumulation noise, and sets empty inputs to bar weight on decrement.
 *
 * @param {string|number} currentValue Current raw input value
 * @param {number} barWeight Weight of currently selected bar/equipment
 * @param {number} delta Amount to adjust (+5, -5, +25, -25)
 * @param {number} [maxWeight=MAX_TARGET_WEIGHT] Maximum allowed weight
 * @returns {number} Sanitized next target weight
 */
function calculateAdjustedWeight(currentValue, barWeight, delta, maxWeight = MAX_TARGET_WEIGHT) {
  const isBlank = currentValue === "" || currentValue === null || currentValue === undefined;
  const current = isBlank ? barWeight : parseFloat(currentValue);
  let next;
  if (isNaN(current)) {
    next = barWeight;
  } else if (isBlank && delta < 0) {
    next = barWeight;
  } else {
    next = current + delta;
  }
  if (next < 0) next = 0;
  if (next > maxWeight) next = maxWeight;
  return Math.round(next * 100) / 100;
}

/**
 * BarbellVisualizer: Deep module responsible for DOM sleeve visualization.
 * Encapsulates plate element construction, compact scaling, empty states, and sleeve mirroring.
 */
const BarbellVisualizer = {
  createPlateElement(weight, getDef = getPlateDef) {
    if (typeof document === "undefined") return null;
    const plateDef = getDef(weight);
    const el = document.createElement("div");
    el.className = `plate plate-${plateDef.size} plate-${plateDef.thickness} plate-${plateDef.color}`;
    el.setAttribute("data-weight", weight);
    el.setAttribute("title", `${weight} lb plate`);

    const label = document.createElement("span");
    label.className = "plate-label";
    label.textContent = weight;
    el.appendChild(label);

    return el;
  },

  render({ leftContainer, rightContainer, stageElement }, platesPerSide) {
    if (!leftContainer || !rightContainer || !stageElement) return;

    leftContainer.innerHTML = "";
    rightContainer.innerHTML = "";

    const plateCount = (platesPerSide || []).length;
    if (plateCount > 8) {
      stageElement.classList.add("barbell-compact", "barbell-ultra-compact");
    } else if (plateCount > 5) {
      stageElement.classList.add("barbell-compact");
      stageElement.classList.remove("barbell-ultra-compact");
    } else {
      stageElement.classList.remove("barbell-compact", "barbell-ultra-compact");
    }

    if (plateCount === 0) {
      stageElement.classList.add("barbell-empty");
      return;
    }
    stageElement.classList.remove("barbell-empty");

    // Right side: largest -> smallest moving away from center (BAR | 45 | 10 | 5 | 2.5)
    const rightFrag = typeof document !== "undefined" && typeof document.createDocumentFragment === "function"
      ? document.createDocumentFragment()
      : null;
    platesPerSide.forEach(weight => {
      const plateEl = this.createPlateElement(weight);
      if (plateEl) {
        if (rightFrag) rightFrag.appendChild(plateEl);
        else rightContainer.appendChild(plateEl);
      }
    });
    if (rightFrag) rightContainer.appendChild(rightFrag);

    // Left side: mirrored (2.5 | 5 | 10 | 45 | BAR)
    const leftFrag = typeof document !== "undefined" && typeof document.createDocumentFragment === "function"
      ? document.createDocumentFragment()
      : null;
    const reversed = [...platesPerSide].reverse();
    reversed.forEach(weight => {
      const plateEl = this.createPlateElement(weight);
      if (plateEl) {
        if (leftFrag) leftFrag.appendChild(plateEl);
        else leftContainer.appendChild(plateEl);
      }
    });
    if (leftFrag) leftContainer.appendChild(leftFrag);
  },

  clear({ leftContainer, rightContainer, stageElement }) {
    if (leftContainer) leftContainer.innerHTML = "";
    if (rightContainer) rightContainer.innerHTML = "";
    if (stageElement) {
      stageElement.classList.remove("barbell-compact", "barbell-ultra-compact", "barbell-empty");
    }
  }
};

/**
 * BreakdownView: Deep module responsible for rendering the breakdown badges and summary stats.
 * Encapsulates badge element creation, formatting, and summary statistics display.
 */
const BreakdownView = {
  createBadgeElement(item) {
    if (typeof document === "undefined") return null;
    const li = document.createElement("li");
    li.className = "breakdown-badge";

    const dot = document.createElement("span");
    dot.className = `plate-dot plate-dot-${(item.plateDef && item.plateDef.color) || "blue"}`;

    const text = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = item.weight;
    text.appendChild(strong);
    text.appendChild(document.createTextNode(`\u00D7${item.count}`));

    li.appendChild(dot);
    li.appendChild(text);
    return li;
  },

  render({ listEl, totalPlatesEl, loadedPerSideEl, barWeightEl, totalWeightEl }, result) {
    if (listEl) {
      listEl.innerHTML = "";
      if (!result.platesPerSide || result.platesPerSide.length === 0) {
        const emptyNotice = document.createElement("li");
        emptyNotice.className = "breakdown-empty-text";
        emptyNotice.textContent = "Bar only (0 plates)";
        listEl.appendChild(emptyNotice);
      } else if (result.breakdown) {
        const frag = typeof document !== "undefined" && typeof document.createDocumentFragment === "function"
          ? document.createDocumentFragment()
          : null;
        result.breakdown.forEach(item => {
          const badge = this.createBadgeElement(item);
          if (badge) {
            if (frag) frag.appendChild(badge);
            else listEl.appendChild(badge);
          }
        });
        if (frag) listEl.appendChild(frag);
      }
    }

    if (totalPlatesEl) totalPlatesEl.textContent = `${result.totalPlatesCount}`;
    if (loadedPerSideEl) loadedPerSideEl.textContent = `${result.weightPerSide} lb`;
    if (barWeightEl) barWeightEl.textContent = `${result.barWeight} lb`;
    if (totalWeightEl) totalWeightEl.textContent = `${result.targetWeight} lb`;
  },

  clear({ listEl, totalPlatesEl, loadedPerSideEl, barWeightEl, totalWeightEl }) {
    if (listEl) listEl.innerHTML = "";
    if (totalPlatesEl) totalPlatesEl.textContent = "0";
    if (loadedPerSideEl) loadedPerSideEl.textContent = "0 lb";
    if (barWeightEl) barWeightEl.textContent = "0 lb";
    if (totalWeightEl) totalWeightEl.textContent = "0 lb";
  }
};

/**
 * ErrorView: Deep module responsible for rendering error diagnostics and closest-weight shortcut buttons.
 * Encapsulates heading construction, button group creation, and event delegation.
 */
const ErrorView = {
  render({ messageEl, closestEl }, result, onSelectWeight) {
    if (messageEl) {
      messageEl.textContent = result.message || "Invalid weight calculation.";
    }

    if (closestEl) {
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
          if (typeof onSelectWeight === "function") {
            btn.addEventListener("click", () => onSelectWeight(weight));
          }
          btnGroup.appendChild(btn);
        });

        closestEl.appendChild(btnGroup);
      }
    }
  },

  clear({ messageEl, closestEl }) {
    if (messageEl) messageEl.textContent = "";
    if (closestEl) closestEl.innerHTML = "";
  }
};

/**
 * CalculatorView: Deep module managing the presentation state machine (empty, error, result).
 * Coordinates mutual exclusivity of container cards and delegates component rendering
 * to BarbellVisualizer, BreakdownView, and ErrorView.
 */
const CalculatorView = {
  _elements: null,
  _state: "empty",

  init(elements) {
    this._elements = elements;
    return this;
  },

  getState() {
    return this._state;
  },

  showEmpty() {
    this._state = "empty";
    if (!this._elements) return;
    const {
      emptyState,
      errorContainer,
      resultsContainer,
      barbellLeft,
      barbellRight,
      barbellStage,
      breakdownList,
      breakdownTotal,
      loadedPerSide,
      barWeightEl,
      totalWeightEl,
      errorMessageEl,
      errorClosestEl
    } = this._elements;

    if (emptyState && emptyState.classList) emptyState.classList.remove("hidden");
    if (errorContainer && errorContainer.classList) errorContainer.classList.add("hidden");
    if (resultsContainer && resultsContainer.classList) resultsContainer.classList.add("hidden");

    BarbellVisualizer.clear({
      leftContainer: barbellLeft,
      rightContainer: barbellRight,
      stageElement: barbellStage
    });

    BreakdownView.clear({
      listEl: breakdownList,
      totalPlatesEl: breakdownTotal,
      loadedPerSideEl: loadedPerSide,
      barWeightEl,
      totalWeightEl
    });

    ErrorView.clear({
      messageEl: errorMessageEl,
      closestEl: errorClosestEl
    });
  },

  showError(result, onSelectWeight) {
    this._state = "error";
    if (!this._elements) return;
    const {
      emptyState,
      errorContainer,
      resultsContainer,
      barbellLeft,
      barbellRight,
      barbellStage,
      breakdownList,
      breakdownTotal,
      loadedPerSide,
      barWeightEl,
      totalWeightEl,
      errorMessageEl,
      errorClosestEl
    } = this._elements;

    if (emptyState && emptyState.classList) emptyState.classList.add("hidden");
    if (resultsContainer && resultsContainer.classList) resultsContainer.classList.add("hidden");
    if (errorContainer && errorContainer.classList) errorContainer.classList.remove("hidden");

    BarbellVisualizer.clear({
      leftContainer: barbellLeft,
      rightContainer: barbellRight,
      stageElement: barbellStage
    });

    BreakdownView.clear({
      listEl: breakdownList,
      totalPlatesEl: breakdownTotal,
      loadedPerSideEl: loadedPerSide,
      barWeightEl,
      totalWeightEl
    });

    ErrorView.render(
      { messageEl: errorMessageEl, closestEl: errorClosestEl },
      result,
      onSelectWeight
    );
  },

  showResult(result, selectedBar) {
    this._state = "result";
    if (!this._elements) return;
    const {
      emptyState,
      errorContainer,
      resultsContainer,
      barNameEl,
      sideWeightEl,
      barbellLeft,
      barbellRight,
      barbellStage,
      breakdownList,
      breakdownTotal,
      loadedPerSide,
      barWeightEl,
      totalWeightEl,
      errorMessageEl,
      errorClosestEl
    } = this._elements;

    if (emptyState && emptyState.classList) emptyState.classList.add("hidden");
    if (errorContainer && errorContainer.classList) errorContainer.classList.add("hidden");
    if (resultsContainer && resultsContainer.classList) resultsContainer.classList.remove("hidden");

    if (barNameEl) barNameEl.textContent = `${(selectedBar && selectedBar.shortName) || (selectedBar && selectedBar.name) || "Bar"} (${(selectedBar && selectedBar.weight) || 45} lb)`;
    if (sideWeightEl) sideWeightEl.textContent = `${result.weightPerSide} lb per side`;

    BarbellVisualizer.render({
      leftContainer: barbellLeft,
      rightContainer: barbellRight,
      stageElement: barbellStage
    }, result.platesPerSide);

    BreakdownView.render({
      listEl: breakdownList,
      totalPlatesEl: breakdownTotal,
      loadedPerSideEl: loadedPerSide,
      barWeightEl,
      totalWeightEl
    }, result);

    ErrorView.clear({
      messageEl: errorMessageEl,
      closestEl: errorClosestEl
    });
  }
};

/**
 * EquipmentDropdown: Deep module managing custom select dropdown, listbox keyboard navigation,
 * and equipment deletion interactions.
 */
const EquipmentDropdown = {
  _elements: null,
  _callbacks: null,
  _currentBarId: null,

  init(elements, callbacks = {}) {
    this._elements = elements;
    this._callbacks = callbacks;

    let initialBarId = EquipmentStore.getLastSelectedId();
    if (!EquipmentStore.getById(initialBarId)) {
      initialBarId = "straight";
    }
    this._currentBarId = initialBarId;

    const { container, trigger, openAddModalBtn, fallbackSelect } = this._elements;

    if (container && typeof container.addEventListener === "function") {
      container.addEventListener("focusout", (e) => {
        if (this.isOpen() && e.relatedTarget && !container.contains(e.relatedTarget)) {
          this.close();
        }
      });
    }

    if (trigger && typeof trigger.addEventListener === "function") {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggle();
      });

      trigger.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          this.open();
          const list = this._elements.optionsList;
          const activeOption = (list && list.querySelector(".dropdown-option.selected")) ||
                               (list && list.querySelector(".dropdown-option"));
          if (activeOption && typeof activeOption.focus === "function") activeOption.focus();
        }
      });
    }

    if (openAddModalBtn && typeof openAddModalBtn.addEventListener === "function") {
      openAddModalBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof this._callbacks.onOpenModal === "function") {
          this._callbacks.onOpenModal();
        }
      });

      openAddModalBtn.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const list = this._elements.optionsList;
          const last = list ? list.lastElementChild : null;
          if (last && typeof last.focus === "function") last.focus();
        }
      });
    }

    if (fallbackSelect && typeof fallbackSelect.addEventListener === "function") {
      fallbackSelect.addEventListener("change", () => {
        this.select(fallbackSelect.value);
      });
    }

    if (typeof document !== "undefined") {
      if (this._outsideClickListener) {
        document.removeEventListener("click", this._outsideClickListener);
      }
      this._outsideClickListener = (e) => {
        if (this._elements && this._elements.container && !this._elements.container.contains(e.target)) {
          this.close();
        }
      };
      document.addEventListener("click", this._outsideClickListener);
    }

    this.render();
    return this;
  },

  getSelectedId() {
    return this._currentBarId;
  },

  getSelectedBar() {
    return EquipmentStore.getById(this._currentBarId) || EquipmentStore.getBuiltIn()[0];
  },

  isOpen() {
    const { container } = this._elements || {};
    return Boolean(container && container.classList.contains("open"));
  },

  open() {
    const { container, menu, trigger, controlsCard } = this._elements || {};
    if (!container || !menu) return;
    container.classList.add("open");
    menu.classList.remove("hidden");
    if (controlsCard) controlsCard.classList.add("has-dropdown-open");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  },

  close() {
    const { container, menu, trigger, controlsCard } = this._elements || {};
    if (!container || !menu) return;
    container.classList.remove("open");
    menu.classList.add("hidden");
    if (controlsCard) controlsCard.classList.remove("has-dropdown-open");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  },

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  },

  select(barId) {
    if (!EquipmentStore.getById(barId)) {
      barId = "straight";
    }
    this._currentBarId = barId;
    EquipmentStore.setLastSelectedId(barId);
    this.render();
    if (this._callbacks && typeof this._callbacks.onSelect === "function") {
      this._callbacks.onSelect(this.getSelectedBar());
    }
  },

  render() {
    if (!this._elements) return;
    const { optionsList, currentNameEl, currentWeightEl, fallbackSelect, trigger, openAddModalBtn } = this._elements;
    const allBars = EquipmentStore.getAll();
    const selectedBar = this.getSelectedBar();

    if (currentNameEl) currentNameEl.textContent = selectedBar.name;
    if (currentWeightEl) currentWeightEl.textContent = `${selectedBar.weight} lb`;

    if (optionsList) {
      optionsList.innerHTML = "";
      allBars.forEach(bar => {
        const option = document.createElement("div");
        const isSelected = bar.id === this._currentBarId;
        option.className = `dropdown-option ${isSelected ? "selected" : ""}`;
        option.setAttribute("role", "option");
        option.setAttribute("tabindex", "0");
        option.setAttribute("aria-selected", isSelected ? "true" : "false");
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
              if (this._currentBarId === bar.id) {
                this.select("straight");
              } else {
                this.render();
              }
              const { trigger } = this._elements || {};
              if (trigger && typeof trigger.focus === "function") {
                trigger.focus();
              }
            }
          });
          delBtn.addEventListener("keydown", (e) => {
            e.stopPropagation();
          });
          rightDiv.appendChild(delBtn);
        }

        option.appendChild(leftDiv);
        option.appendChild(rightDiv);

        option.addEventListener("click", () => {
          this.select(bar.id);
          this.close();
        });

        option.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.select(bar.id);
            this.close();
            if (trigger) trigger.focus();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextOpt = option.nextElementSibling;
            if (nextOpt) {
              nextOpt.focus();
            } else if (openAddModalBtn) {
              openAddModalBtn.focus();
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prevOpt = option.previousElementSibling;
            if (prevOpt) {
              prevOpt.focus();
            } else if (trigger) {
              trigger.focus();
            }
          } else if (e.key === "Home") {
            e.preventDefault();
            const first = optionsList.firstElementChild;
            if (first) first.focus();
          } else if (e.key === "End") {
            e.preventDefault();
            const last = optionsList.lastElementChild;
            if (last) last.focus();
          }
        });

        optionsList.appendChild(option);
      });
    }

    if (fallbackSelect) {
      fallbackSelect.innerHTML = "";
      allBars.forEach(bar => {
        const option = document.createElement("option");
        option.value = bar.id;
        option.textContent = `${bar.name} (${bar.weight} lb)`;
        fallbackSelect.appendChild(option);
      });
      fallbackSelect.value = this._currentBarId;
    }
  }
};

/**
 * EquipmentModal: Deep module managing custom equipment creation dialog, focus trapping,
 * and form validation lifecycle.
 */
const EquipmentModal = {
  _elements: null,
  _callbacks: null,
  _triggerElement: null,

  init(elements, callbacks = {}) {
    this._elements = elements;
    this._callbacks = callbacks;

    const { modalEl, formEl, closeBtn, cancelBtn } = this._elements;

    if (closeBtn && typeof closeBtn.addEventListener === "function") {
      closeBtn.addEventListener("click", () => this.close());
    }

    if (cancelBtn && typeof cancelBtn.addEventListener === "function") {
      cancelBtn.addEventListener("click", () => this.close());
    }

    if (modalEl && typeof modalEl.addEventListener === "function") {
      modalEl.addEventListener("click", (e) => {
        if (e.target === modalEl) {
          this.close();
        }
      });

      // Trap focus inside modal
      modalEl.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          const focusable = modalEl.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const focusableArr = Array.from(focusable).filter(
            el => !el.disabled && el.offsetParent !== null
          );
          if (focusableArr.length === 0) return;
          const first = focusableArr[0];
          const last = focusableArr[focusableArr.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }

    if (formEl && typeof formEl.addEventListener === "function") {
      formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        const { nameInput, weightInput, errorEl } = this._elements;
        const name = nameInput ? nameInput.value.trim() : "";
        const weight = weightInput ? weightInput.value.trim() : "";

        try {
          const newBar = EquipmentStore.add({ name, weight });
          this.close();
          if (this._callbacks && typeof this._callbacks.onSave === "function") {
            this._callbacks.onSave(newBar);
          }
        } catch (err) {
          if (errorEl) {
            errorEl.textContent = err.message;
            errorEl.classList.remove("hidden");
          }
        }
      });
    }

    return this;
  },

  isOpen() {
    const { modalEl } = this._elements || {};
    return Boolean(modalEl && !modalEl.classList.contains("hidden"));
  },

  open(triggerEl = null) {
    this._triggerElement = triggerEl || (typeof document !== "undefined" ? document.activeElement : null);
    const { modalEl, nameInput, weightInput, errorEl } = this._elements || {};

    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.add("hidden");
    }
    if (nameInput) nameInput.value = "";
    if (weightInput) weightInput.value = "";

    if (modalEl) {
      modalEl.classList.remove("hidden");
      setTimeout(() => {
        if (nameInput) nameInput.focus();
      }, 50);
    }
  },

  close() {
    const { modalEl } = this._elements || {};
    if (modalEl) {
      modalEl.classList.add("hidden");
    }
    if (this._triggerElement && typeof this._triggerElement.focus === "function") {
      this._triggerElement.focus();
    }
  }
};

// Export for Node testing if in commonjs environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EquipmentStore,
    EquipmentDropdown,
    EquipmentModal,
    CalculatorView,
    BarbellVisualizer,
    BreakdownView,
    ErrorView,
    safeStorage,
    STORAGE_KEYS,
    DEFAULT_BARS,
    MAX_TARGET_WEIGHT,
    bars,
    plates,
    getPlateDef,
    getPlateBreakdown,
    calculatePlateLoad,
    calculateAdjustedWeight,
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
  const clearBtn = document.getElementById("clear-btn");
  const calcForm = document.getElementById("calc-form");

  // Presentation containers & elements
  const emptyState = document.getElementById("empty-state");
  const errorContainer = document.getElementById("error-container");
  const resultsContainer = document.getElementById("results-container");
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

  // Modal elements
  const addModal = document.getElementById("add-equipment-modal");
  const addForm = document.getElementById("add-equipment-form");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  const newEquipNameInput = document.getElementById("new-equip-name");
  const newEquipWeightInput = document.getElementById("new-equip-weight");
  const modalErrorMsg = document.getElementById("modal-error-msg");

  // Initialize Presentation State Machine
  CalculatorView.init({
    emptyState,
    errorContainer,
    resultsContainer,
    barNameEl: resBarNameEl,
    sideWeightEl: resSideWeightEl,
    barbellStage: barbellEl,
    barbellLeft: barbellLeftContainer,
    barbellRight: barbellRightContainer,
    breakdownList,
    breakdownTotal: breakdownTotalPlates,
    loadedPerSide: loadedPerSideEl,
    barWeightEl,
    totalWeightEl,
    errorMessageEl,
    errorClosestEl
  });

  // Initialize Equipment Dropdown module
  EquipmentDropdown.init({
    container: dropdownContainer,
    trigger: dropdownTrigger,
    menu: dropdownMenu,
    optionsList: dropdownOptionsList,
    currentNameEl: dropdownCurrentName,
    currentWeightEl: dropdownCurrentWeight,
    fallbackSelect: barSelect,
    controlsCard,
    openAddModalBtn
  }, {
    onSelect: () => calculate(),
    onOpenModal: () => {
      EquipmentDropdown.close();
      EquipmentModal.open(dropdownTrigger);
    }
  });

  // Initialize Equipment Modal module
  EquipmentModal.init({
    modalEl: addModal,
    formEl: addForm,
    closeBtn: modalCloseBtn,
    cancelBtn: modalCancelBtn,
    nameInput: newEquipNameInput,
    weightInput: newEquipWeightInput,
    errorEl: modalErrorMsg
  }, {
    onSave: (newBar) => {
      EquipmentDropdown.select(newBar.id);
      const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (!isTouch && targetInput) {
        targetInput.focus();
      }
    }
  });

  // Global Escape key handler
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (EquipmentModal.isOpen()) {
        EquipmentModal.close();
      } else if (EquipmentDropdown.isOpen()) {
        EquipmentDropdown.close();
        if (dropdownTrigger) dropdownTrigger.focus();
      } else if (targetInput && targetInput.value !== "") {
        targetInput.value = "";
        calculate();
      }
    }
  });

  // Stepper Adjusters (5 lb default, or 25 lb with Shift key / Shift+Click)
  function adjustWeight(delta) {
    if (!targetInput) return;
    const selectedBar = EquipmentDropdown.getSelectedBar();
    const next = calculateAdjustedWeight(targetInput.value.trim(), selectedBar.weight, delta);
    targetInput.value = next;
    calculate();
    // Only maintain focus if already focused, avoiding mobile virtual keyboard popup
    if (document.activeElement === targetInput) {
      targetInput.focus();
    }
  }

  if (stepUpBtn) {
    stepUpBtn.addEventListener("click", (e) => adjustWeight(e.shiftKey ? 25 : 5));
  }
  if (stepDownBtn) {
    stepDownBtn.addEventListener("click", (e) => adjustWeight(e.shiftKey ? -25 : -5));
  }

  // Prevent double-tap zoom on iOS Safari when tapping buttons rapidly
  document.addEventListener("dblclick", (e) => {
    e.preventDefault();
  }, { passive: false });

  // Target input events
  if (targetInput) {
    targetInput.addEventListener("input", calculate);

    // Keyboard arrow stepper (5 lb increments, or 25 lb with Shift) & Enter to blur/calculate
    targetInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        targetInput.blur();
        calculate();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const delta = e.shiftKey ? 25 : 5;
        adjustWeight(delta);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const delta = e.shiftKey ? -25 : -5;
        adjustWeight(delta);
      }
    });
  }

  if (calcForm) {
    calcForm.addEventListener("submit", (e) => {
      e.preventDefault();
      calculate();
    });
  }

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (targetInput) {
        targetInput.value = "";
      }
      calculate();
      const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (!isTouch && targetInput) {
        targetInput.focus();
      }
    });
  }

  function calculate() {
    if (!targetInput) return;
    const rawVal = targetInput.value.trim();
    const selectedBar = EquipmentDropdown.getSelectedBar();

    // Default/blank state
    if (rawVal === "") {
      CalculatorView.showEmpty();
      return;
    }

    const targetWeight = parseFloat(rawVal);
    const result = calculatePlateLoad(selectedBar.weight, targetWeight);

    if (!result.valid) {
      CalculatorView.showError(result, (weight) => {
        if (targetInput) {
          targetInput.value = weight;
        }
        calculate();
      });
    } else {
      CalculatorView.showResult(result, selectedBar);
    }
  }

  // Initial calculation check
  calculate();

  // Register Service Worker for offline gym use & PWA install
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        // Silently ignore if served from non-secure context or file://
      });
    });
  }
}
