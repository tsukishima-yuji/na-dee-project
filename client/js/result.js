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

    <div class="result-grid">
    <div class="result-col">
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

    <!-- This week's weather (Open-Meteo), filled in by renderWeather() -->
    <h2 class="section-title">${t("weather_title")}</h2>
    <section class="info-card weather-card" id="weatherCard">
      <p class="weather-loading">${t("weather_loading")}</p>
    </section>

    <!-- Irrigation advice -->
    <h2 class="section-title">${t("result_advice_title")}</h2>
    <section class="info-card">
      ${infoRow("💧", t("result_frequency"), best.irrigation_frequency)}
      ${infoRow("📅", t("result_schedule"), best.weekly_schedule)}
      ${infoRow("🌱", t("result_fertilizer"), best.n_fertilizer)}
      ${infoRow("🌾", t("result_variety"), best.variety)}
    </section>

    </div>
    <div class="result-col">
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

    </div>
    </div>

    ${best.source ? `<p class="source-note">${t("result_source")}: ${escapeHtml(best.source)}</p>` : ""}

    <div class="result-actions">
      <a class="btn-primary" href="compare.html">${t("result_compare_btn")}</a>
      <a class="btn-secondary" href="input-form.html">${t("result_again_btn")}</a>
    </div>
  `;

  renderWeather(best, input); // async — fills #weatherCard when Open-Meteo answers
}

/* ---------------- Weather (external API: Open-Meteo) ---------------- */

async function renderWeather(best, input) {
  const card = document.getElementById("weatherCard");
  if (!card) return;

  let weather;
  try {
    weather = await getWeeklyWeather(input.province); // weather.js
  } catch (err) {
    console.error("weather error:", err);
    // Error handling: the page still works with the research-based numbers
    card.innerHTML = `<p class="weather-error">⚠️ ${t("weather_error")}</p>`;
    return;
  }

  // The page may have been re-rendered (language switch) while we waited
  const current = document.getElementById("weatherCard");
  if (!current) return;

  const adj = adjustWaterForWeather(best, weather, input.cultivated_area);
  const maxRain = Math.max(...weather.days.map((d) => d.rain_mm), 5);
  const locale = getLang() === "th" ? "th-TH" : "en-US";

  let advice;
  if (adj.base_per_rai === 0) advice = t("weather_advice_rainfed");
  else if (adj.skip_irrigation) advice = t("weather_advice_skip");
  else
    advice = `${t("weather_advice_prefix")} <b>${fmt(adj.adjusted_per_rai)}</b> ${t("unit_m3_rai_week")} · ${t("weather_total")} <b>${fmt(adj.adjusted_total)}</b> ${t("unit_m3")}`;

  current.innerHTML = `
    <div class="weather-days">
      ${weather.days
        .map((d) => {
          const day = new Date(d.date + "T00:00:00").toLocaleDateString(locale, { weekday: "short" });
          const h = Math.max((d.rain_mm / maxRain) * 100, 3);
          return `
          <div class="weather-day">
            <span class="wd-rain">${fmt(d.rain_mm)}</span>
            <div class="wd-bar"><div style="height:${h}%"></div></div>
            <span class="wd-name">${day}</span>
            <span class="wd-temp">${Math.round(d.temp_max)}°</span>
          </div>`;
        })
        .join("")}
    </div>
    <p class="weather-caption">${t("weather_rain_caption")}</p>

    <div class="weather-stats">
      <div><span>${t("weather_rain")}</span><b>${fmt(weather.total_rain_mm)} ${t("unit_mm")}</b></div>
      <div><span>${t("weather_need")}</span><b>${fmt(adj.crop_need_mm)} ${t("unit_mm")}</b></div>
      <div><span>${t("weather_cover")}</span><b>${adj.rain_cover_percent}%</b></div>
    </div>

    <div class="weather-advice ${adj.skip_irrigation ? "skip" : ""}">
      <span>💧</span>
      <p>${advice}
        ${adj.saved_total > 0 && !adj.skip_irrigation ? `<br><small>${t("weather_saved")} ${fmt(adj.saved_total)} ${t("unit_m3")}</small>` : ""}
      </p>
    </div>
    <p class="weather-source">${t("weather_source")}</p>
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