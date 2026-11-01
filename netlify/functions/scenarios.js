/* =========================================================
   netlify/functions/scenarios.js
   GET    /api/scenarios          -> list all scenarios (auto-loads the 32 research scenarios if empty)
   POST   /api/scenarios          -> create a scenario (rejects duplicate conditions)
   POST   /api/scenarios?seed=1   -> (re)write the 32 research scenarios (safe to repeat)
   POST   /api/scenarios?reset=1  -> delete everything, then write the 32 research scenarios
   PUT    /api/scenarios/:id      -> update a scenario (rejects duplicate conditions)
   DELETE /api/scenarios/:id      -> delete a scenario

   Stored in Netlify Blobs — one blob per scenario, keyed by
   scenario_id. Field list lives in netlify/lib/scenario-schema.js,
   research base data in netlify/lib/seed.js
   ========================================================= */

const { openStore } = require("../lib/blob-store");
const { sanitizeScenario } = require("../lib/scenario-schema");
const { listOrSeed, writeSeed, resetToSeed, readAll, isDuplicate } = require("../lib/seed");

const STORE_NAME = "scenarios";

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

/** Scenario id from ?id=123, or from the path /api/scenarios/123 (live Netlify keeps the original path) */
function getId(event) {
  const query = event.queryStringParameters || {};
  if (query.id) return String(query.id);
  const m = String(event.path || event.rawUrl || "").match(/scenarios\/(\d+)/);
  return m ? m[1] : null;
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const store = openStore(STORE_NAME, event);
  const query = event.queryStringParameters || {};
  const id = getId(event);

  try {
    switch (event.httpMethod) {
      case "GET": {
        const res = json(200, await listOrSeed(store));
        res.headers["Access-Control-Allow-Origin"] = "*"; // read-only access for other apps
        return res;
      }

      case "POST": {
        if (query.reset) return json(200, await resetToSeed(store));
        if (query.seed) return json(200, await writeSeed(store));

        const body = parseBody(event);
        if (!body) return json(400, { error: "Invalid request body" });

        const { data, errors } = sanitizeScenario(body);
        if (errors.length) return json(400, { error: errors.join("; ") });
        if (isDuplicate(await readAll(store), data)) {
          return json(409, { error: "A scenario with these 4 conditions already exists" });
        }

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
        if (isDuplicate(await readAll(store), updated, existing.scenario_id)) {
          return json(409, { error: "A scenario with these 4 conditions already exists" });
        }

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
