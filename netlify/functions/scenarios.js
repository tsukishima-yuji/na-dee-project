/* =========================================================
   netlify/functions/scenarios.js
   GET    /api/scenarios         -> list all scenarios
   POST   /api/scenarios         -> create a scenario
   POST   /api/scenarios?seed=1  -> load research dataset (only when empty)
   PUT    /api/scenarios/:id     -> update a scenario
   DELETE /api/scenarios/:id     -> delete a scenario

   Stored in Netlify Blobs — one blob per scenario, keyed by
   scenario_id. Field list lives in netlify/lib/scenario-schema.js
   ========================================================= */

const { getStore, connectLambda } = require("@netlify/blobs");
const { sanitizeScenario } = require("../lib/scenario-schema");
const SEED_SCENARIOS = require("../data/seed-scenarios.json");

const STORE_NAME = "scenarios";

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function getStoreInstance(event) {
  connectLambda(event);
  return getStore(STORE_NAME, {
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

async function listScenarios(store) {
  const { blobs } = await store.list();
  const scenarios = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  return scenarios.filter(Boolean).sort((a, b) => a.scenario_id - b.scenario_id);
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const store = getStoreInstance(event);
  const query = event.queryStringParameters || {};
  const id = query.id;

  try {
    switch (event.httpMethod) {
      case "GET":
        return json(200, await listScenarios(store));

      case "POST": {
        // ---- Load the research dataset in one click ----
        if (query.seed) {
          const existing = await listScenarios(store);
          if (existing.length > 0) {
            return json(409, { error: "Scenarios already exist — delete them first to reload the dataset" });
          }
          const now = Date.now();
          const created = [];
          for (let i = 0; i < SEED_SCENARIOS.length; i++) {
            const { data } = sanitizeScenario(SEED_SCENARIOS[i]);
            const scenario = { scenario_id: now + i, ...data, created_at: new Date().toISOString() };
            await store.setJSON(String(scenario.scenario_id), scenario);
            created.push(scenario);
          }
          return json(201, created);
        }

        const body = parseBody(event);
        if (!body) return json(400, { error: "Invalid request body" });

        const { data, errors } = sanitizeScenario(body);
        if (errors.length) return json(400, { error: errors.join("; ") });

        const scenario = { scenario_id: Date.now(), ...data, created_at: new Date().toISOString() };
        await store.setJSON(String(scenario.scenario_id), scenario);
        return json(201, scenario);
      }

      case "PUT": {
        if (!id) return json(400, { error: "Missing scenario id" });

        const existing = await store.get(id, { type: "json" });
        if (!existing) return json(404, { error: "Scenario not found" });

        const body = parseBody(event);
        if (!body) return json(400, { error: "Invalid request body" });

        const { data, errors } = sanitizeScenario(body, { partial: true });
        if (errors.length) return json(400, { error: errors.join("; ") });

        const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
        if (!updated.name_en) updated.name_en = updated.name_th;

        await store.setJSON(id, updated);
        return json(200, updated);
      }

      case "DELETE": {
        if (!id) return json(400, { error: "Missing scenario id" });
        await store.delete(id);
        return json(200, { success: true });
      }

      default:
        return json(405, { error: "Method not allowed" });
    }
  } catch (err) {
    console.error("scenarios error:", err);
    return json(500, { error: "Server error, please try again" });
  }
};
