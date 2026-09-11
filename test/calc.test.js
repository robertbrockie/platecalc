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

console.log("\nALL TESTS PASSED SUCCESSFULLY!");
