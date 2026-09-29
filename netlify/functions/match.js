/* =========================================================
   netlify/functions/match.js
   POST /api/match
   body: { province, variety, planting_date, irrigation_type, cultivated_area }

   Rule-based matching: every scenario gets a score out of 100
     province         40   (soil + weather differ by province)
     irrigation_type  30   (rain-fed vs. irrigated)
     planting season  20   (early vs. late rainy season)
     variety          10   (farmer's text vs. scenario's variety list)
   Ties are broken by the higher water-use efficiency, so the most
   water-saving scenario is recommended first.

   Response:
     { best, ranked: [...all scenarios with match_percent + totals], input }
   Each submission is also saved to the "submissions" store
   (InputSubmission entity in the ER diagram).
   ========================================================= */

const { getStore, connectLambda } = require("@netlify/blobs");

const WEIGHTS = { province: 40, irrigation_type: 30, planting_season: 20, variety: 10 };

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function storeFor(name) {
  return getStore(name, {
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN,
  });
}

/** "ห้วยบง 80" / "Huay Bong-80" / "huaybong80" -> "ห้วยบง80" / "huaybong80" */
function normalize(text) {
  return String(text || "").toLowerCase().replace(/[\s\-_.]/g, "");
}

function varietyMatches(farmerVariety, scenarioVarieties) {
  const input = normalize(farmerVariety);
  if (!input) return false;
  return String(scenarioVarieties || "")
    .split(",")
    .map(normalize)
    .filter(Boolean)
    .some((v) => v.includes(input) || input.includes(v));
}

function scoreScenario(scenario, input) {
  const breakdown = {
    province: scenario.province === input.province,
    irrigation_type: scenario.irrigation_type === input.irrigation_type,
    planting_season: scenario.planting_season === input.planting_date,
    variety: varietyMatches(input.variety, scenario.variety),
  };
  const match_percent = Object.entries(breakdown).reduce(
    (sum, [key, ok]) => sum + (ok ? WEIGHTS[key] : 0),
    0
  );
  return { match_percent, breakdown };
}

function round(n, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const input = {
    province: String(body.province || "").trim(),
    variety: String(body.variety || "").trim(),
    planting_date: String(body.planting_date || "").trim(),
    irrigation_type: String(body.irrigation_type || "").trim(),
    cultivated_area: Number(body.cultivated_area),
  };

  if (!input.province || !input.planting_date || !input.irrigation_type) {
    return json(400, { error: "province, planting_date and irrigation_type are required" });
  }
  if (!Number.isFinite(input.cultivated_area) || input.cultivated_area <= 0) {
    return json(400, { error: "cultivated_area must be a number greater than 0" });
  }

  connectLambda(event);

  try {
    const scenarioStore = storeFor("scenarios");
    const { blobs } = await scenarioStore.list();
    const scenarios = (
      await Promise.all(blobs.map((b) => scenarioStore.get(b.key, { type: "json" })))
    ).filter(Boolean);

    if (scenarios.length === 0) {
      return json(404, { error: "No scenarios available yet — ask the admin to add scenario data" });
    }

    const area = input.cultivated_area;
    const ranked = scenarios
      .map((s) => {
        const { match_percent, breakdown } = scoreScenario(s, input);
        return {
          ...s,
          match_percent,
          match_breakdown: breakdown,
          totals: {
            water_week_m3: round((s.water_allocation_week || 0) * area),
            yield_tons: round((s.predicted_yield || 0) * area),
          },
        };
      })
      .sort(
        (a, b) =>
          b.match_percent - a.match_percent ||
          (b.water_use_efficiency || 0) - (a.water_use_efficiency || 0)
      );

    const best = ranked[0];

    // Save the submission (InputSubmission). Never block the farmer if this fails.
    try {
      const submission_id = Date.now();
      await storeFor("submissions").setJSON(String(submission_id), {
        submission_id,
        ...input,
        matched_scenario_id: best.scenario_id,
        match_percent: best.match_percent,
        submitted_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("could not save submission:", err);
    }

    return json(200, { best, ranked, input });
  } catch (err) {
    console.error("match error:", err);
    return json(500, { error: "Server error, please try again" });
  }
};
