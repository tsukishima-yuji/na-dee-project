/* =========================================================
   netlify/lib/scenario-schema.js
   One place that defines what a Scenario looks like
   (matches the ER diagram). Used by scenarios.js and match.js.
   ========================================================= */

// type: "text" | "number" | "enum"
const SCENARIO_FIELDS = {
  name_th:               { type: "text", required: true },
  name_en:               { type: "text" },
  description:           { type: "text" },
  province:              { type: "enum", values: ["khon_kaen", "udon_thani"], required: true },

  // --- matching keys (compared with the farmer's input form) ---
  variety:               { type: "text" },   // comma-separated, e.g. "ห้วยบง 80, Huay Bong 80"
  planting_season:       { type: "enum", values: ["early", "late"] },
  irrigation_type:       { type: "enum", values: ["rain_fed", "system"] },

  // --- outputs shown to the farmer ---
  predicted_yield:       { type: "number" }, // ตัน/ไร่ (fresh root)
  water_allocation_week: { type: "number" }, // ลบ.ม./ไร่/สัปดาห์
  irrigation_frequency:  { type: "text" },
  water_use_efficiency:  { type: "number" }, // กก./ลบ.ม.
  n_fertilizer:          { type: "text" },
  weekly_schedule:       { type: "text" },
  source:                { type: "text" },   // reference for the numbers
};

/**
 * Clean incoming data. For "create" every field gets a value;
 * for "update" only fields that were actually sent are returned.
 */
function sanitizeScenario(input, { partial = false } = {}) {
  const out = {};
  const errors = [];

  for (const [key, rule] of Object.entries(SCENARIO_FIELDS)) {
    const present = input[key] !== undefined && input[key] !== null;
    if (!present) {
      if (!partial) out[key] = rule.type === "number" ? 0 : "";
      continue;
    }

    if (rule.type === "number") {
      const n = Number(input[key]);
      out[key] = Number.isFinite(n) && n >= 0 ? n : 0;
    } else if (rule.type === "enum") {
      const v = String(input[key]).trim();
      if (v !== "" && !rule.values.includes(v)) errors.push(`${key} must be one of ${rule.values.join(", ")}`);
      out[key] = v;
    } else {
      out[key] = String(input[key]).trim();
    }
  }

  if (!partial) {
    for (const [key, rule] of Object.entries(SCENARIO_FIELDS)) {
      if (rule.required && !out[key]) errors.push(`${key} is required`);
    }
    if (!out.name_en) out.name_en = out.name_th;
  }

  return { data: out, errors };
}

module.exports = { SCENARIO_FIELDS, sanitizeScenario };
