/* =========================================================
   compare.js — logic for compare.html only
   Loads live scenarios from /api/scenarios, filters by province,
   and shows them side by side as a bar chart + a table.
   If the farmer already has a match result, that scenario is
   highlighted and the province is pre-selected.
   ========================================================= */

let allScenarios = [];
let currentProvince = "khon_kaen";
let currentMetric = "predicted_yield";

const METRICS = [
  { key: "predicted_yield", label: "compare_metric_yield", unit: "unit_ton_rai" },
  { key: "water_allocation_week", label: "compare_metric_water", unit: "unit_m3_rai_week" },
  { key: "water_use_efficiency", label: "compare_metric_wue", unit: "unit_kg_m3" },
];

document.addEventListener("DOMContentLoaded", async () => {
  const match = readMatchResult();
  if (match && match.input && match.input.province) currentProvince = match.input.province;

  const switchEl = document.getElementById("provinceSwitch");
  switchEl.addEventListener("click", (e) => {
    const pill = e.target.closest(".choice-pill");
    if (!pill) return;
    currentProvince = pill.dataset.value;
    renderPage();
  });

  const root = document.getElementById("compareRoot");
  root.innerHTML = `<p class="loading-note">${t("compare_loading")}</p>`;
  try {
    allScenarios = await getScenarios(); // api.js
  } catch (err) {
    root.innerHTML = `<p class="loading-note">${t("toast_error")}</p>`;
    return;
  }
  renderPage();
});

function renderPage() {
  const root = document.getElementById("compareRoot");
  if (!root) return;

  document.querySelectorAll("#provinceSwitch .choice-pill").forEach((p) =>
    p.classList.toggle("selected", p.dataset.value === currentProvince)
  );

  const match = readMatchResult();
  const bestId = match && match.best ? match.best.scenario_id : null;
  const scenarios = allScenarios.filter((s) => s.province === currentProvince);

  if (scenarios.length === 0) {
    root.innerHTML = `<p class="loading-note">${t("compare_empty")}</p>`;
    return;
  }

  const metric = METRICS.find((m) => m.key === currentMetric);
  const max = Math.max(...scenarios.map((s) => Number(s[metric.key]) || 0), 1);

  root.innerHTML = `
    <!-- Chart -->
    <h2 class="section-title">${t("compare_chart_title")}</h2>
    <section class="info-card">
      <div class="metric-tabs" role="tablist">
        ${METRICS.map(
          (m) => `<button type="button" class="metric-tab ${m.key === currentMetric ? "active" : ""}" data-metric="${m.key}">${t(m.label)}</button>`
        ).join("")}
      </div>
      <div class="bar-chart">
        ${scenarios
          .map((s) => {
            const value = Number(s[metric.key]) || 0;
            const width = Math.max((value / max) * 100, 2);
            const isBest = s.scenario_id === bestId;
            return `
            <div class="bar-row ${isBest ? "is-best" : ""}">
              <div class="bar-label">${escapeHtml(scenarioName(s))}${isBest ? ` <span class="best-tag">${t("compare_your_match")}</span>` : ""}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${width}%"></div>
                <span class="bar-value">${fmt(value)}</span>
              </div>
            </div>`;
          })
          .join("")}
      </div>
      <p class="bar-unit">${t(metric.unit)}</p>
    </section>

    <!-- Table -->
    <h2 class="section-title">${t("compare_table_title")}</h2>
    <section class="table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>${t("compare_metric_yield")}</th>
            <th>${t("compare_metric_water")}</th>
            <th>WUE</th>
            <th>${t("result_fertilizer")}</th>
            <th>${t("result_frequency")}</th>
          </tr>
        </thead>
        <tbody>
          ${scenarios
            .map(
              (s) => `
            <tr class="${s.scenario_id === bestId ? "is-best" : ""}">
              <td class="name-cell">${escapeHtml(scenarioName(s))}${s.scenario_id === bestId ? ` <span class="best-tag">${t("compare_your_match")}</span>` : ""}</td>
              <td class="num-cell" data-label="${t("compare_metric_yield")}"><b>${fmt(s.predicted_yield)}</b> <small>${t("unit_ton_rai")}</small></td>
              <td class="num-cell" data-label="${t("compare_metric_water")}"><b>${fmt(s.water_allocation_week)}</b> <small>${t("unit_m3_rai_week")}</small></td>
              <td class="num-cell" data-label="WUE"><b>${fmt(s.water_use_efficiency)}</b> <small>${t("unit_kg_m3")}</small></td>
              <td class="text-cell" data-label="${t("result_fertilizer")}">${escapeHtml(s.n_fertilizer || "-")}</td>
              <td class="text-cell" data-label="${t("result_frequency")}">${escapeHtml(s.irrigation_frequency || "-")}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>
    <p class="source-note">${t("compare_note")}</p>
  `;

  root.querySelectorAll(".metric-tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentMetric = btn.dataset.metric;
      renderPage();
    })
  );
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

function fmt(n) {
  if (n === null || n === undefined || n === "") return "-";
  return Number(n).toLocaleString(getLang() === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 1 });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}