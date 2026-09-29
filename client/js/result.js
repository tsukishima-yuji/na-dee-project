/* =========================================================
   result.js — logic for result.html only
   Reads the /api/match response saved by input-form.js
   (sessionStorage "nadee_match_result") and shows:
   best scenario + match %, predicted outputs for the farmer's
   area, irrigation advice, and why this scenario was matched.
   ========================================================= */

document.addEventListener("DOMContentLoaded", renderPage);

function renderPage() {
  const root = document.getElementById("resultRoot");
  const result = readMatchResult();

  if (!result || !result.best) {
    root.innerHTML = `
      <section class="empty-card">
        <p>${t("result_empty")}</p>
        <a class="btn-primary" href="input-form.html">${t("home_cta")}</a>
      </section>`;
    return;
  }

  const { best, input, ranked } = result;
  const area = input.cultivated_area;
  const alternatives = ranked.filter((s) => s.scenario_id !== best.scenario_id && s.province === input.province);

  root.innerHTML = `
    <!-- Best match -->
    <section class="hero-card result-hero">
      <span class="hero-eyebrow">${t("result_eyebrow")}</span>
      <div class="result-hero-top">
        <h1 class="hero-title">${escapeHtml(scenarioName(best))}</h1>
        <div class="match-ring" style="--p:${best.match_percent}">
          <span>${best.match_percent}%</span>
        </div>
      </div>
      <p class="hero-desc">${escapeHtml(best.description || "")}</p>
      <div class="input-chips">
        <span>${escapeHtml(labelFor("province", input.province))}</span>
        ${input.variety ? `<span>${escapeHtml(input.variety)}</span>` : ""}
        <span>${escapeHtml(labelFor("planting", input.planting_date))}</span>
        <span>${escapeHtml(labelFor("irrigation", input.irrigation_type))}</span>
        <span>${fmt(area)} ${t("unit_rai")}</span>
      </div>
    </section>

    <!-- Predicted outputs for the whole field -->
    <h2 class="section-title">${t("result_outputs_title")}</h2>
    <section class="stats-row">
      <div class="stat-box">
        <div class="stat-number">${fmt(best.totals.yield_tons)}</div>
        <div class="stat-label">${t("result_total_yield")}</div>
        <div class="stat-sub">${fmt(best.predicted_yield)} ${t("unit_ton_rai")}</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${fmt(best.totals.water_week_m3)}</div>
        <div class="stat-label">${t("result_total_water")}</div>
        <div class="stat-sub">${fmt(best.water_allocation_week)} ${t("unit_m3_rai_week")}</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${fmt(best.water_use_efficiency)}</div>
        <div class="stat-label">WUE</div>
        <div class="stat-sub">${t("unit_kg_m3")}</div>
      </div>
    </section>

    <!-- Irrigation advice -->
    <h2 class="section-title">${t("result_advice_title")}</h2>
    <section class="info-card">
      ${infoRow("💧", t("result_frequency"), best.irrigation_frequency)}
      ${infoRow("📅", t("result_schedule"), best.weekly_schedule)}
      ${infoRow("🌱", t("result_fertilizer"), best.n_fertilizer)}
      ${infoRow("🌾", t("result_variety"), best.variety)}
    </section>

    <!-- Why this scenario -->
    <h2 class="section-title">${t("result_why_title")}</h2>
    <section class="info-card">
      ${breakdownRow("province", 40, best.match_breakdown.province)}
      ${breakdownRow("irrigation", 30, best.match_breakdown.irrigation_type)}
      ${breakdownRow("planting", 20, best.match_breakdown.planting_season)}
      ${breakdownRow("variety", 10, best.match_breakdown.variety)}
    </section>

    <!-- Other options -->
    ${
      alternatives.length
        ? `<h2 class="section-title">${t("result_other_title")}</h2>
           <section class="approach-list">
             ${alternatives
               .map(
                 (s) => `
               <div class="approach-item">
                 <div>
                   <div class="approach-name">${escapeHtml(scenarioName(s))}</div>
                   <div class="approach-sub">${fmt(s.predicted_yield)} ${t("unit_ton_rai")} · ${fmt(s.water_allocation_week)} ${t("unit_m3_rai_week")}</div>
                 </div>
                 <span class="approach-badge">${s.match_percent}%</span>
               </div>`
               )
               .join("")}
           </section>`
        : ""
    }

    ${best.source ? `<p class="source-note">${t("result_source")}: ${escapeHtml(best.source)}</p>` : ""}

    <div class="result-actions">
      <a class="btn-primary" href="compare.html">${t("result_compare_btn")}</a>
      <a class="btn-secondary" href="input-form.html">${t("result_again_btn")}</a>
    </div>
  `;
}

/* ---------------- helpers ---------------- */

function readMatchResult() {
  try {
    return JSON.parse(sessionStorage.getItem("nadee_match_result"));
  } catch {
    return null;
  }
}

function scenarioName(s) {
  return getLang() === "th" ? s.name_th : s.name_en || s.name_th;
}

function labelFor(kind, value) {
  const keys = {
    province: { khon_kaen: "form_province_kk", udon_thani: "form_province_ud" },
    planting: { early: "form_planting_early", late: "form_planting_late" },
    irrigation: { rain_fed: "irrigation_short_rain", system: "irrigation_short_system" },
  };
  const key = keys[kind] && keys[kind][value];
  return key ? t(key) : value || "-";
}

function infoRow(icon, label, value) {
  return `
    <div class="info-row">
      <span class="info-icon">${icon}</span>
      <div>
        <div class="info-label">${label}</div>
        <div class="info-value">${escapeHtml(value || "-")}</div>
      </div>
    </div>`;
}

function breakdownRow(kind, weight, matched) {
  const labels = {
    province: "form_province",
    irrigation: "form_irrigation",
    planting: "form_planting_date",
    variety: "form_variety",
  };
  return `
    <div class="breakdown-row ${matched ? "ok" : "miss"}">
      <span class="breakdown-mark">${matched ? "✓" : "✕"}</span>
      <span class="breakdown-label">${t(labels[kind])}</span>
      <span class="breakdown-points">${matched ? weight : 0}/${weight}</span>
    </div>`;
}

function fmt(n) {
  if (n === null || n === undefined || n === "") return "-";
  return Number(n).toLocaleString(getLang() === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 1 });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
