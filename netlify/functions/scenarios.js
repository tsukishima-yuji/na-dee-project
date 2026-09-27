/* =========================================================
   netlify/functions/scenarios.js
   GET    /api/scenarios       -> list all scenarios
   POST   /api/scenarios       -> create a scenario
   PUT    /api/scenarios/:id   -> update a scenario
   DELETE /api/scenarios/:id   -> delete a scenario

   Stored in Netlify Blobs (same approach as login.js) — one
   blob per scenario, keyed by scenario_id.
   ========================================================= */

const { getStore, connectLambda } = require("@netlify/blobs");

const STORE_NAME = "scenarios";

function json(statusCode, body) {
  return { statusCode, body: JSON.stringify(body) };
}

function getStoreInstance(event) {
  connectLambda(event);
  return getStore(STORE_NAME, {
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

exports.handler = async (event) => {
  const store = getStoreInstance(event);
  const id = event.queryStringParameters && event.queryStringParameters.id;

  try {
    switch (event.httpMethod) {
      case "GET": {
        const { blobs } = await store.list();
        const scenarios = await Promise.all(
          blobs.map((b) => store.get(b.key, { type: "json" }))
        );
        scenarios.sort((a, b) => a.scenario_id - b.scenario_id);
        return json(200, scenarios);
      }

      case "POST": {
        let data;
        try {
          data = JSON.parse(event.body || "{}");
        } catch {
          return json(400, { error: "Invalid request body" });
        }
        if (!data.name_th || !data.province) {
          return json(400, { error: "name_th and province are required" });
        }

        const scenario = {
          scenario_id: Date.now(),
          name_th: String(data.name_th).trim(),
          name_en: String(data.name_en || data.name_th).trim(),
          province: String(data.province).trim(),
          water_allocation_week: Number(data.water_allocation_week) || 0,
          irrigation_frequency: String(data.irrigation_frequency || "").trim(),
          created_at: new Date().toISOString(),
        };

        await store.setJSON(String(scenario.scenario_id), scenario);
        return json(201, scenario);
      }

      case "PUT": {
        if (!id) return json(400, { error: "Missing scenario id" });

        const existing = await store.get(id, { type: "json" });
        if (!existing) return json(404, { error: "Scenario not found" });

        let data;
        try {
          data = JSON.parse(event.body || "{}");
        } catch {
          return json(400, { error: "Invalid request body" });
        }

        const updated = {
          ...existing,
          name_th: data.name_th !== undefined ? String(data.name_th).trim() : existing.name_th,
          name_en:
            data.name_en !== undefined
              ? String(data.name_en).trim()
              : data.name_th !== undefined
              ? String(data.name_th).trim()
              : existing.name_en,
          province: data.province !== undefined ? String(data.province).trim() : existing.province,
          water_allocation_week:
            data.water_allocation_week !== undefined
              ? Number(data.water_allocation_week) || 0
              : existing.water_allocation_week,
          irrigation_frequency:
            data.irrigation_frequency !== undefined
              ? String(data.irrigation_frequency).trim()
              : existing.irrigation_frequency,
        };

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