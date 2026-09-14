const assert = require("assert");
const { bars, plates, calculatePlateLoad } = require("../public/js/app.js");

console.log("--- Checking Bars Configuration ---");
assert.strictEqual(bars.length, 4);
assert.deepStrictEqual(bars.map(b => b.id), ["straight", "trap", "preacher15", "preacher25"]);
assert.deepStrictEqual(bars.map(b => b.weight), [45, 55, 15, 25]);
console.log("✓ Bars configuration verified");

console.log("--- Checking Plates Configuration ---");
assert.strictEqual(plates.length, 6);
assert.deepStrictEqual(plates.map(p => p.weight), [45, 35, 25, 10, 5, 2.5]);
assert.deepStrictEqual(plates.map(p => p.color), ["blue", "yellow", "green", "white", "blue", "green"]);
assert.deepStrictEqual(plates.map(p => p.size), ["large", "large", "large", "small", "small", "small"]);
assert.deepStrictEqual(plates.map(p => p.thickness), ["thick", "medium", "thin", "thick", "medium", "thin"]);
plates.forEach(p => assert.strictEqual(p.available, null));
console.log("✓ Plates configuration verified");

console.log("--- Running Acceptance Tests ---");

// Test 1: Straight Bar / 45
let res = calculatePlateLoad(45, 45);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, []);
assert.strictEqual(res.weightPerSide, 0);
assert.strictEqual(res.totalPlatesCount, 0);
console.log("✓ Straight Bar / 45 => no plates");

// Test 2: Straight Bar / 135
res = calculatePlateLoad(45, 135);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [45]);
assert.strictEqual(res.weightPerSide, 45);
assert.strictEqual(res.totalPlatesCount, 2);
console.log("✓ Straight Bar / 135 => 45 each side");

// Test 3: Straight Bar / 225
res = calculatePlateLoad(45, 225);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [45, 45]);
assert.strictEqual(res.weightPerSide, 90);
assert.strictEqual(res.totalPlatesCount, 4);
console.log("✓ Straight Bar / 225 => 45 + 45 each side");

// Test 4: Straight Bar / 315
res = calculatePlateLoad(45, 315);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [45, 45, 45]);
assert.strictEqual(res.weightPerSide, 135);
assert.strictEqual(res.totalPlatesCount, 6);
assert.strictEqual(res.breakdown[0].weight, 45);
assert.strictEqual(res.breakdown[0].count, 3);
console.log("✓ Straight Bar / 315 => 45 + 45 + 45 each side");

// Test 5: Trap Bar / 145
res = calculatePlateLoad(55, 145);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [45]);
assert.strictEqual(res.weightPerSide, 45);
console.log("✓ Trap bar / 145 => 45 each side");

// Test 6: Trap Bar / 185
res = calculatePlateLoad(55, 185);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [45, 10, 10]);
assert.strictEqual(res.weightPerSide, 65);
assert.strictEqual(res.totalPlatesCount, 6);
console.log("✓ Trap bar / 185 => 45 + 10 + 10 each side");

// Test 7: EZ curl bar 15 lb / 65
res = calculatePlateLoad(15, 65);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [25]);
assert.strictEqual(res.weightPerSide, 25);
console.log("✓ EZ curl bar 15 lb / 65 => 25 each side");

// Test 8: EZ curl bar 25 lb / 75
res = calculatePlateLoad(25, 75);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [25]);
assert.strictEqual(res.weightPerSide, 25);
console.log("✓ EZ curl bar 25 lb / 75 => 25 each side");

// Test 9: Invalid Straight Bar / 40
res = calculatePlateLoad(45, 40);
assert.strictEqual(res.valid, false);
assert.strictEqual(res.reason, "TARGET_BELOW_BAR");
assert.strictEqual(res.message, "Target weight must be at least 45 lb for this bar.");
console.log("✓ Invalid: Straight Bar / 40 => below bar error");

// Test 10: Invalid Straight Bar / 47
res = calculatePlateLoad(45, 47);
assert.strictEqual(res.valid, false);
assert.strictEqual(res.reason, "TARGET_NOT_LOADABLE");
assert.deepStrictEqual(res.closestWeights, [45, 50]);
console.log("✓ Invalid: Straight Bar / 47 => not loadable exactly (closest 45, 50)");

console.log("\n--- Running Plate-Loaded Machine Tests (Hack Squat / Leg Press) ---");

// Test 11: Hack Squat machine (105 lb starting weight) / 105 lb
res = calculatePlateLoad(105, 105);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, []);
assert.strictEqual(res.weightPerSide, 0);
assert.strictEqual(res.totalPlatesCount, 0);
console.log("✓ Hack Squat (105 lb) / 105 => no plates");

// Test 12: Hack Squat machine (105 lb starting weight) / 195 lb
res = calculatePlateLoad(105, 195);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [45]);
assert.strictEqual(res.weightPerSide, 45);
assert.strictEqual(res.totalPlatesCount, 2);
console.log("✓ Hack Squat (105 lb) / 195 => 45 each side");

// Test 13: Hack Squat machine (105 lb starting weight) / 200 lb
res = calculatePlateLoad(105, 200);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [45, 2.5]);
assert.strictEqual(res.weightPerSide, 47.5);
assert.strictEqual(res.totalPlatesCount, 4);
console.log("✓ Hack Squat (105 lb) / 200 => 45 + 2.5 each side");

// Test 14: Hack Squat machine (105 lb starting weight) / 100 lb (below starting weight)
res = calculatePlateLoad(105, 100);
assert.strictEqual(res.valid, false);
assert.strictEqual(res.reason, "TARGET_BELOW_BAR");
assert.strictEqual(res.message, "Target weight must be at least 105 lb for this bar.");
console.log("✓ Invalid: Hack Squat (105 lb) / 100 => below starting weight error");

// Test 15: Hack Squat machine (105 lb starting weight) / 197 lb (not loadable)
res = calculatePlateLoad(105, 197);
assert.strictEqual(res.valid, false);
assert.strictEqual(res.reason, "TARGET_NOT_LOADABLE");
assert.deepStrictEqual(res.closestWeights, [195, 200]);
console.log("✓ Invalid: Hack Squat (105 lb) / 197 => not loadable exactly (closest 195, 200)");

// Test 16: Leg Press machine (118 lb starting weight) / 208 lb
res = calculatePlateLoad(118, 208);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [45]);
assert.strictEqual(res.weightPerSide, 45);
console.log("✓ Leg Press (118 lb) / 208 => 45 each side");

console.log("\n--- Running Custom Equipment Storage & CRUD Tests ---");
const { getAllBars, addCustomBar, deleteCustomBar } = require("../public/js/app.js");

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

assert.strictEqual(getAllBars().length, 4);

// Test adding custom equipment
const hackSquat = addCustomBar({ name: "Gold's Hack Squat", weight: 105 });
assert.strictEqual(hackSquat.name, "Gold's Hack Squat");
assert.strictEqual(hackSquat.weight, 105);
assert.strictEqual(hackSquat.isCustom, true);
assert.strictEqual(getAllBars().length, 5);
console.log("✓ Successfully added custom equipment (Gold's Hack Squat, 105 lb)");

// Test validation
assert.throws(() => addCustomBar({ name: "", weight: 100 }), /Please enter an equipment name/);
assert.throws(() => addCustomBar({ name: "Bad Weight", weight: 0 }), /Please enter a valid starting weight/);
assert.throws(() => addCustomBar({ name: "Bad Weight", weight: -10 }), /Please enter a valid starting weight/);
console.log("✓ Validation properly rejects empty name and non-positive weights");

// Test deleting custom equipment
deleteCustomBar(hackSquat.id);
assert.strictEqual(getAllBars().length, 4);
console.log("✓ Successfully removed custom equipment");

console.log("\n--- Running Input Robustness & Invariant Tests ---");

// Non-numeric inputs
[NaN, "abc", null, undefined, {}].forEach(badInput => {
  const r = calculatePlateLoad(45, badInput);
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.reason, "INVALID_INPUT");
  assert.strictEqual(r.message, "Please enter a valid target weight.");
});
console.log("✓ All non-numeric target inputs safely return INVALID_INPUT");

// Negative target weight
res = calculatePlateLoad(45, -20);
assert.strictEqual(res.valid, false);
assert.strictEqual(res.reason, "TARGET_BELOW_BAR");
console.log("✓ Negative target weights safely return TARGET_BELOW_BAR");

// Half-pound precision calculations
res = calculatePlateLoad(15.5, 20.5);
assert.strictEqual(res.valid, true);
assert.deepStrictEqual(res.platesPerSide, [2.5]);
assert.strictEqual(res.weightPerSide, 2.5);
console.log("✓ Half-pound bar (15.5 lb) with target (20.5 lb) loads 2.5 lb plate per side");

// Target with invalid plate increment (137.5 lb on 45 lb bar)
res = calculatePlateLoad(45, 137.5);
assert.strictEqual(res.valid, false);
assert.strictEqual(res.reason, "TARGET_NOT_LOADABLE");
assert.deepStrictEqual(res.closestWeights, [135, 140]);
console.log("✓ Decimal target 137.5 lb suggests closest valid weights [135, 140]");

// Closest weight bounds test (46 lb on 45 lb bar does not suggest weights < 45)
res = calculatePlateLoad(45, 46);
assert.strictEqual(res.valid, false);
assert.deepStrictEqual(res.closestWeights, [45, 50]);
console.log("✓ Near-bar weight 46 lb bounds lower suggestion to bar weight [45, 50]");

// Closest weight for 52 lb on 45 lb bar
res = calculatePlateLoad(45, 52);
assert.strictEqual(res.valid, false);
assert.deepStrictEqual(res.closestWeights, [50, 55]);
console.log("✓ Target 52 lb suggests closest weights [50, 55]");

console.log("\n--- Running Heavy Powerlifting Load Stress Tests ---");

// 1,000 lb load
res = calculatePlateLoad(45, 1000);
assert.strictEqual(res.valid, true);
assert.strictEqual(res.weightPerSide, 477.5);
assert.strictEqual(res.platesPerSide.reduce((a, b) => a + b, 0), 477.5);
assert.strictEqual(res.totalPlatesCount, 24); // (10×45 + 1×25 + 1×2.5) * 2
console.log("✓ 1,000 lb load calculates correctly (477.5 lb per side, 24 plates total)");

// 2,000 lb load
res = calculatePlateLoad(45, 2000);
assert.strictEqual(res.valid, true);
assert.strictEqual(res.weightPerSide, 977.5);
assert.strictEqual(res.platesPerSide.reduce((a, b) => a + b, 0), 977.5);
assert.strictEqual(res.totalPlatesCount, 48);
console.log("✓ 2,000 lb load calculates correctly (977.5 lb per side, 48 plates total)");

console.log("\n--- Running EquipmentStore Deep Module & Storage Resilience Tests ---");
const { EquipmentStore, safeStorage } = require("../public/js/app.js");

// Built-in checks
assert.strictEqual(EquipmentStore.getBuiltIn().length, 4);
assert.strictEqual(EquipmentStore.getById("straight").weight, 45);
assert.strictEqual(EquipmentStore.getById("nonexistent"), null);
console.log("✓ EquipmentStore.getBuiltIn and getById resolve correctly");

// Last selected bar tracking
EquipmentStore.setLastSelectedId("trap");
assert.strictEqual(EquipmentStore.getLastSelectedId(), "trap");
console.log("✓ EquipmentStore tracks and persists last selected bar");

// Corrupted JSON resilience
mockStorage["platecalc_custom_bars"] = "INVALID_CORRUPTED_JSON{{{";
const safeBars = EquipmentStore.getCustom();
assert.deepStrictEqual(safeBars, []);
console.log("✓ EquipmentStore handles corrupted storage without throwing");

// QuotaExceeded / storage write failure resilience
const origSetItem = global.localStorage.setItem;
global.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
const writeSuccess = safeStorage.set("test_key", "value");
assert.strictEqual(writeSuccess, false);
console.log("✓ safeStorage safely catches storage exceptions in restricted contexts");
global.localStorage.setItem = origSetItem;

console.log("\nALL TESTS PASSED SUCCESSFULLY!");
