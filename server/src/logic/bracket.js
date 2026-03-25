const { nextPowerOfTwo } = require("./zonas");
const { seedingPositions, classicSeedingPositions } = require("./seeding");

function seedEntries(entries) {
  const total = entries.length;
  const bracketSize = nextPowerOfTwo(total || 2);
  const result = seedingPositions(bracketSize, entries);
  
  // seedingPositions returns {order, byePositions, warnings}
  const seedOrder = Array.isArray(result) ? result : result.order;
  const warnings = Array.isArray(result?._warnings) ? result._warnings : (result?.warnings || []);
  const byePositions = result?.byePositions || new Set();

  const byes = bracketSize - total;
  const slots = new Array(bracketSize).fill(null);

  let entryIndex = 0;
  for (let i = 0; i < seedOrder.length; i += 1) {
    const slotIndex = seedOrder[i];
    if (byePositions.has(slotIndex)) continue;
    slots[slotIndex] = entryIndex < entries.length ? entries[entryIndex] : null;
    entryIndex += 1;
  }

  return { bracketSize, slots, byePositions, warnings };
}

function buildSlots(qualifiedRows) {
  // Este parametro llega desde rankQualified(), con cortes de clasificacion
  // ya aplicados por zona. El orden de entrada define la siembra base.
  const seeded = seedEntries(qualifiedRows);
  return {
    ...seeded,
    slots: seeded.slots.map((row) => (row?.pair_id != null ? row.pair_id : null)),
  };
}

module.exports = { seedingPositions, seedEntries, buildSlots };
