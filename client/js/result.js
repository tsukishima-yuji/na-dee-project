/* =========================================================
   result.js — logic for result.html only
   Reads the /api/match response saved by input-form.js
   (sessionStorage "nadee_match_result") and shows:
   - hero: total harvest for the field (+ normal-year range),
     the inputs as chips, and the yield level gauge
   - actionable recommendations (water, fertilizer, variety)
   - buttons to the compare page / back to the form
   The data source sits in a small ⓘ tooltip.
   ========================================================= */

const FARMER_AVG_T_RAI = 3.0; // national average 2025/26 (fresh root, t/rai)
const LEVELS = [
  { key: "low", max: 2.5 },
  { key: "mid", max: 4.0 },
  { key: "high", max: Infinity },
];
const BAR_MAX = 7; // t/rai at the right end of the level bar

document.addEventListener("DOMContentLoaded", renderPage);

function renderPage() {
  const root = document.getElementById("resultRoot");
  const result = readMatchResult();

  if (!result || !result.best || !result.best.totals) {
    root.innerHTML = `
      <section class="empty-card">
        <p>${t("result_empty")}</p>
        <a class="btn-cta" href="input-form.html"><span>${t("home_cta")}</span>${icon("arrowRight")}</a>
      </section>`;
    return;
  }

  const { best, input } = result;
  const perRai = Number(best.predicted_yield) || 0;
  const level = LEVELS.find((l) => perRai < l.max);
  const markerPct = Math.min((perRai / BAR_MAX) * 100, 100);
  const nApplied = best.nitrogen === "applied";
  const irrigated = best.irrigation_type === "system";

  root.innerHTML = `
    <!-- Hero: how much + how good -->
    <section class="res-hero">
      <div class="res-hero-main">
        <span class="res-eyebrow"><span class="dot"></span>${t("result_eyebrow")}</span>
        <div class="res-total">
          <span class="res-total-num">${fmt(best.totals.yield_tons)}</span>
          <span class="res-total-unit">${t("unit_ton")}</span>
        </div>
        <p class="res-sub">${icon("trend")}
          ${t("result_for_field")} ${fmt(input.cultivated_area)} ${t("unit_rai")}
          · ${t("result_normal_year")} ${fmt(best.totals.yield_tons_low)}–${fmt(best.totals.yield_tons_high)} ${t("unit_ton")}
        </p>
        <p class="res-fresh">${t("result_fresh_note")}
          ${best.source ? `<span class="info-tip" tabindex="0" role="button" aria-label="${t("result_source_title")}">${icon("info")}
            <span class="info-tip-box" role="tooltip">${escapeHtml(localized(best, "source"))}</span></span>` : ""}
        </p>
      </div>

      <div class="res-level">
        <div class="res-level-head">
          <span class="res-level-title">${t("result_level_title")}</span>
          <span class="level-badge level-${level.key}">${t("level_" + level.key)}</span>
        </div>
        <div class="res-level-value"><b>${fmt(perRai, 2)}</b> ${t("unit_ton_rai")}</div>
        <div class="level-bar">
          <div class="level-seg low"></div><div class="level-seg mid"></div><div class="level-seg high"></div>
          <span class="level-marker" style="left:${markerPct}%"></span>
        </div>
        <div class="level-scale">
          <span>0</span><span style="left:${(2.5 / BAR_MAX) * 100}%">2.5</span>
          <span style="left:${(4 / BAR_MAX) * 100}%">4</span><span class="end">${BAR_MAX}</span>
        </div>
        <p class="res-level-compare">${compareText(perRai / FARMER_AVG_T_RAI)}</p>
      </div>

      <div class="res-chips">
        <span class="res-chip">${icon("sprout")}${escapeHtml(t("variety_" + input.variety))}</span>
        <span class="res-chip">${icon("calendar")}${escapeHtml(labelFor("planting", input.planting_date))}</span>
        <span class="res-chip">${icon("droplet")}${escapeHtml(labelFor("irrigation", input.irrigation_type))}</span>
        <span class="res-chip">${icon("leaf")}${escapeHtml(labelFor("nitrogen", input.nitrogen))}</span>
      </div>
    </section>

    <div class="res-cols">
    <div class="res-col">
    <!-- What to do -->
    <h2 class="section-title">${t("rec_title")}</h2>
    <section class="rec-card">
      ${recRow("droplet", "blue", t("result_frequency"), localized(best, "irrigation_frequency"),
        irrigated ? t("badge_managed") : t("badge_natural"), "blue")}
      ${recRow("leaf", "green", t("result_fertilizer"), localized(best, "n_fertilizer"),
        nApplied ? t("badge_important") : t("badge_not_applied"), nApplied ? "green" : "grey", nApplied)}
      ${recRow("sprout", "amber", t("form_variety"), t("variety_" + best.variety), t("badge_selected"), "amber")}
    </section>

    </div>
    <div class="res-col">
    <!-- Live check from our /api/planting-check (which calls Open-Meteo) -->
    <h2 class="section-title">${t("pc_title")}</h2>
    <section class="pc-card" id="plantingCheck">
      <p class="pc-loading">${t("pc_loading")}</p>
    </section>
    </div>
    </div>

    <div class="res-actions">
      <a class="btn-cta" href="compare.html">${icon("sparkles")}<span>${t("result_compare_btn")}</span>${icon("arrowRight")}</a>
      <a class="btn-ghost" href="input-form.html">${icon("edit")}<span>${t("result_again_btn")}</span></a>
    </div>
  `;

  renderPlantingCheck(input); // async — fills the live card when the API answers
}

/* ---------------- live planting check (external API via our API) ---------------- */

let plantingCheckCache = null;

async function renderPlantingCheck(input) {
  const card = document.getElementById("plantingCheck");
  if (!card) return;
  try {
    plantingCheckCache = plantingCheckCache || (await getPlantingCheck()); // api.js -> GET /api/planting-check
  } catch (err) {
    card.innerHTML = `<p class="pc-error">${icon("info")}${t("pc_error")}</p>`;
    return;
  }
  const pc = plantingCheckCache;
  const el = document.getElementById("plantingCheck");
  if (!el) return; // page re-rendered meanwhile

  const rainfed = input.irrigation_type === "rain_fed";
  const msgKey =
    pc.verdict === "good" ? "pc_msg_good" : pc.verdict === "watch" ? "pc_msg_watch" : rainfed ? "pc_msg_irrigate_rainfed" : "pc_msg_irrigate_system";
  const maxRain = Math.max(...pc.daily.map((d) => d.rain_mm), 5);
  const locale = getLang() === "th" ? "th-TH" : "en-US";

  el.innerHTML = `
    <div class="pc-head">
      <span class="pc-verdict ${pc.verdict}">${icon(pc.verdict === "good" ? "sprout" : pc.verdict === "watch" ? "info" : "droplet")}${t("pc_verdict_" + pc.verdict)}</span>
      <span class="pc-live"><span class="dot"></span>${t("pc_live")}</span>
    </div>
    <p class="pc-msg">${t(msgKey)}</p>
    <div class="pc-stats">
      <div><span>${t("pc_soil")}</span><b>${fmt(pc.soil_moisture_now * 100)}%</b><small>${t("pc_soil_" + pc.soil_status)}</small></div>
      <div><span>${t("pc_rain_past")}</span><b>${fmt(pc.rain_past_7d_mm)}</b><small>${t("unit_mm")}</small></div>
      <div><span>${t("pc_rain_next")}</span><b>${fmt(pc.rain_next_14d_mm)}</b><small>${t("unit_mm")}</small></div>
    </div>
    <div class="pc-bars" aria-label="${t("pc_chart_label")}">
      ${pc.daily
        .map((d) => {
          const h = Math.max((d.rain_mm / maxRain) * 100, 3);
          const day = new Date(d.date + "T00:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" });
          return `<div class="pc-bar ${d.forecast ? "fc" : "past"}" title="${day}: ${fmt(d.rain_mm)} ${t("unit_mm")}"><span style="height:${h}%"></span></div>`;
        })
        .join("")}
    </div>
    <div class="pc-legend"><span class="past">${t("pc_legend_past")}</span><span class="fc">${t("pc_legend_fc")}</span></div>
    <p class="pc-source">${t("pc_source")}</p>`;
}

/* ---------------- pieces ---------------- */

function recRow(ico, tone, label, value, badge, badgeTone, highlight = false) {
  return `
    <div class="rec-row ${highlight ? "highlight" : ""}">
      <span class="rec-ico ${tone}">${icon(ico)}</span>
      <div class="rec-text">
        <div class="rec-label">${label}</div>
        <div class="rec-value">${escapeHtml(value || "-")}</div>
      </div>
      <span class="rec-badge ${badgeTone}">${badge}</span>
    </div>`;
}

function compareText(ratio) {
  if (ratio >= 1.15) return `${t("level_vs_above")} ${fmt(ratio, 1)} ${t("level_vs_times")}`;
  if (ratio <= 0.85) return t("level_vs_below");
  return t("level_vs_same");
}

/* ---------------- helpers ---------------- */

function readMatchResult() {
  try {
    return JSON.parse(sessionStorage.getItem("nadee_match_result"));
  } catch {
    return null;
  }
}

function labelFor(kind, value) {
  const keys = {
    planting: { early: "form_planting_early", late: "form_planting_late" },
    irrigation: { rain_fed: "irrigation_short_rain", system: "irrigation_short_system" },
    nitrogen: { applied: "chip_n_applied", not_applied: "chip_n_none" },
  };
  const key = keys[kind] && keys[kind][value];
  return key ? t(key) : value || "-";
}

function fmt(n, digits = 1) {
  if (n === null || n === undefined || n === "") return "-";
  return Number(n).toLocaleString(getLang() === "th" ? "th-TH" : "en-US", { maximumFractionDigits: digits });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
