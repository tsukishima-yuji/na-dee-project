/* =========================================================
   netlify/lib/seed.js
   The 32 DSSAT research scenarios are the BASE data.

   - Each research scenario has a FIXED id (1001 ... 1032), so
     loading the dataset again just overwrites the same 32 blobs.
     It can never create duplicates, no matter how many times
     it runs or how many people click at the same time.
   - listOrSeed(): if the store is empty, the base data is written
     automatically, so a new site works without any button.
   ========================================================= */

const SEED_SCENARIOS = require("../data/seed-scenarios.json");
const { sanitizeScenario } = require("./scenario-schema");

const SEED_ID_BASE = 1001;

function buildSeed() {
  return SEED_SCENARIOS.map((raw, i) => ({
    scenario_id: SEED_ID_BASE + i,
    ...sanitizeScenario(raw).data,
    is_research: true,
    created_at: "2026-11-01T00:00:00.000Z",
  }));
}

async function writeSeed(store) {
  const scenarios = buildSeed();
  await Promise.all(scenarios.map((s) => store.setJSON(String(s.scenario_id), s)));
  return scenarios;
}

async function readAll(store) {
  const { blobs } = await store.list();
  const items = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  return items.filter(Boolean).sort((a, b) => a.scenario_id - b.scenario_id);
}

/** All scenarios; writes the research base data first if the store is empty. */
async function listOrSeed(store) {
  const scenarios = await readAll(store);
  if (scenarios.length > 0) return scenarios;
  return writeSeed(store);
}

/** Delete everything, then write the 32 research scenarios again. */
async function resetToSeed(store) {
  const { blobs } = await store.list();
  await Promise.all(blobs.map((b) => store.delete(b.key)));
  return writeSeed(store);
}

/** true if another scenario already uses the same 4 matching conditions */
function isDuplicate(scenarios, data, ignoreId = null) {
  return scenarios.some(
    (s) =>
      s.scenario_id !== ignoreId &&
      s.variety === data.variety &&
      s.planting_season === data.planting_season &&
      s.irrigation_type === data.irrigation_type &&
      s.nitrogen === data.nitrogen
  );
}

module.exports = { listOrSeed, writeSeed, resetToSeed, readAll, isDuplicate };
