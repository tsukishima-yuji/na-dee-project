/* =========================================================
   netlify/functions/match.js
   POST /api/match
   body: { variety, planting_date, irrigation_type, nitrogen, cultivated_area }

   Exact matching: the 4 inputs together point to exactly ONE of the
   32 DSSAT scenarios (4 varieties x 2 planting x 2 water x 2 nitrogen).

   Response:
     {
       best,          // the farmer's scenario (+ totals for their field)
       alternatives,  // same variety + planting date, other water / nitrogen options
       ranked,        // [best, ...alternatives]  (kept so result/compare pages still work)
       input
     }
   Each submission is also saved to the "submissions" store.
   ========================================================= */

const { openStore } = require("../lib/blob-store");
const { listOrSeed } = require("../lib/seed");

const ALLOWED = {
  variety: ["KU50", "RY9", "RY11", "CMR38"],
  planting_date: ["early", "late"],
  irrigation_type: ["rain_fed", "system"],
  nitrogen: ["applied", "not_applied"],
};

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function round(n, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Add whole-field totals: yield per rai x number of rai (+ low/high range from yield_sd) */
function withTotals(s, area) {
  const perRai = Number(s.predicted_yield) || 0;
  const sd = Number(s.yield_sd) || 0;
  return {
    ...s,
    totals: {
      area_rai: area,
      yield_tons: round(perRai * area),
      yield_tons_low: round(Math.max(perRai - sd, 0) * area),
      yield_tons_high: round((perRai + sd) * area),
    },
  };
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
    province: "khon_kaen",
    variety: String(body.variety || "").trim(),
    planting_date: String(body.planting_date || "").trim(),
    irrigation_type: String(body.irrigation_type || "").trim(),
    nitrogen: String(body.nitrogen || "").trim(),
    cultivated_area: Number(body.cultivated_area),
  };

  for (const [key, values] of Object.entries(ALLOWED)) {
    if (!values.includes(input[key])) {
      return json(400, { error: `${key} must be one of ${values.join(", ")}` });
    }
  }
  if (!Number.isFinite(input.cultivated_area) || input.cultivated_area <= 0) {
    return json(400, { error: "cultivated_area must be a number greater than 0" });
  }

  try {
    const scenarios = await listOrSeed(openStore("scenarios", event)); // auto-loads the research data if empty

    if (scenarios.length === 0) {
      return json(404, { error: "No scenarios available yet — ask the admin to add scenario data" });
    }

    const sameGroup = scenarios.filter(
      (s) => s.variety === input.variety && s.planting_season === input.planting_date
    );
    const exact = sameGroup.find(
      (s) => s.irrigation_type === input.irrigation_type && s.nitrogen === input.nitrogen
    );

    if (!exact) {
      return json(404, { error: "No scenario found for this combination — ask the admin to check the data" });
    }

    const area = input.cultivated_area;
    const best = { ...withTotals(exact, area), match_percent: 100 };
    const alternatives = sameGroup
      .filter((s) => s.scenario_id !== exact.scenario_id)
      .map((s) => {
        const alt = withTotals(s, area);
        alt.diff_per_rai = round(alt.predicted_yield - best.predicted_yield, 2);
        alt.diff_tons = round(alt.totals.yield_tons - best.totals.yield_tons);
        return alt;
      })
      .sort((a, b) => b.predicted_yield - a.predicted_yield);

    // Save the submission. Never block the farmer if this fails.
    try {
      const submission_id = Date.now();
      await openStore("submissions", event).setJSON(String(submission_id), {
        submission_id,
        ...input,
        matched_scenario_id: best.scenario_id,
        submitted_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("could not save submission:", err);
    }

    return json(200, { best, alternatives, ranked: [best, ...alternatives], input });
  } catch (err) {
    console.error("match error:", err);
    return json(500, { error: "Server error, please try again" });
  }
};
