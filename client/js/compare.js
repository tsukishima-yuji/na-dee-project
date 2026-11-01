/* =========================================================
   compare.js — logic for compare.html only
   The farmer's own result is the baseline. Same variety, and we
   change ONE thing at a time:  fertilizer / water / planting date.
   - Filter chips choose which changes to show (multi-select)
   - Toggle shows yield for the whole field or per rai
   - One comparison table (cards on mobile)
   ========================================================= */

let allScenarios = [];
let activeFilters = ["nitrogen", "water", "planting"];
let currentMetric = "field"; // "field" | "per_rai"

const FILTERS = [
  { key: "nitrogen", icon: "leaf", label: "cmp_filter_nitrogen" },
  { key: "water", icon: "droplet", label: "cmp_filter_water" },
  { key: "planting", icon: "calendar", label: "cmp_filter_planting" },
];

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("compareRoot");
  if (!readMatchResult()) return renderPage();

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

  const match = readMatchResult();
  if (!match || !match.input || !match.best) {
    root.innerHTML = `
      <section class="empty-card">
        <p>${t("compare_need_input")}</p>
        <a class="btn-cta" href="input-form.html"><span>${t("home_cta")}</span>${icon("arrowRight")}</a>
      </section>`;
    return;
  }
  if (allScenarios.length === 0) return; // still loading

  const input = match.input;
  const area = Number(input.cultivated_area) > 0 ? Number(input.cultivated_area) : 1;
  const find = (planting, water, n) =>
    allScenarios.find(
      (s) => s.variety === input.variety && s.planting_season === planting && s.irrigation_type === water && s.nitrogen === n
    );

  const yours = find(input.planting_date, input.irrigation_type, input.nitrogen);
  if (!yours) {
    root.innerHTML = `<p class="loading-note">${t("compare_empty")}</p>`;
    return;
  }

  const flipN = input.nitrogen === "applied" ? "not_applied" : "applied";
  const flipW = input.irrigation_type === "system" ? "rain_fed" : "system";
  const flipP = input.planting_date === "early" ? "late" : "early";

  const allRows = [
    { key: "yours", s: yours, label: t("compare_yours_label"), mine: true },
    { key: "nitrogen", changed: "nitrogen", s: find(input.planting_date, input.irrigation_type, flipN),
      label: t(flipN === "applied" ? "compare_if_add_n" : "compare_if_no_n") },
    { key: "water", changed: "water", s: find(input.planting_date, flipW, input.nitrogen),
      label: t(flipW === "system" ? "compare_if_add_water" : "compare_if_no_water") },
    { key: "planting", changed: "planting", s: find(flipP, input.irrigation_type, input.nitrogen),
      label: t(flipP === "late" ? "compare_if_late" : "compare_if_early") },
  ].filter((r) => r.s);

  const base = Number(yours.predicted_yield) || 0;
  allRows.forEach((r) => {
    r.perRai = Number(r.s.predicted_yield) || 0;
    r.total = r.perRai * area;
    r.diff = (r.perRai - base) * (currentMetric === "field" ? area : 1);
  });

  const rows = allRows.filter((r) => r.mine || activeFilters.includes(r.key));
  const best = allRows.filter((r) => !r.mine && r.diff > 0.005).sort((a, b) => b.diff - a.diff)[0];
  const unit = currentMetric === "field" ? t("unit_ton") : t("unit_ton_rai");
  const digits = currentMetric === "field" ? 1 : 2;

  root.innerHTML = `
    <!-- Baseline -->
    <section class="cmp-base">
      <div class="cmp-base-top">
        <div class="cmp-base-title"><span class="dot"></span>${t("cmp_base_title")}</div>
        <span class="cmp-base-pill">${t("cmp_base_pill")}</span>
      </div>
      <div class="cmp-base-chips">
        ${chip("sprout", t("variety_" + input.variety))}
        ${chip("calendar", labelFor("planting", input.planting_date))}
        ${chip("droplet", labelFor("irrigation", input.irrigation_type))}
        ${chip("leaf", labelFor("nitrogen", input.nitrogen))}
        ${chip("ruler", `${fmt(area)} ${t("unit_rai")}`)}
      </div>
    </section>

    <!-- Filters -->
    <section class="cmp-toolbar">
      <div class="cmp-toolbar-group">
        <span class="cmp-toolbar-label">${icon("sliders")}${t("cmp_filter_title")}</span>
        <div class="cmp-filters" role="group">
          ${FILTERS.map(
            (f) => `<button type="button" class="cmp-filter ${activeFilters.includes(f.key) ? "on" : ""}" data-filter="${f.key}" aria-pressed="${activeFilters.includes(f.key)}">
                      <span class="cmp-check">${activeFilters.includes(f.key) ? "✓" : ""}</span>${icon(f.icon)}${t(f.label)}</button>`
          ).join("")}
        </div>
      </div>
      <div class="cmp-toolbar-group">
        <span class="cmp-toolbar-label">${t("cmp_show_as")}</span>
        <div class="cmp-segment" role="tablist">
          <button type="button" class="${currentMetric === "field" ? "on" : ""}" data-metric="field">${t("compare_metric_field")}</button>
          <button type="button" class="${currentMetric === "per_rai" ? "on" : ""}" data-metric="per_rai">${t("compare_metric_per_rai")}</button>
        </div>
      </div>
    </section>

    <!-- Table -->
    <section class="cmp-table-card">
      <table class="cmp-table">
        <thead>
          <tr>
            <th>${t("compare_col_scenario")}</th>
            <th class="num">${t("cmp_col_yield")} <small>(${unit})</small></th>
            <th class="num">${t("compare_col_diff")}</th>
            <th>${t("result_fertilizer")}</th>
            <th>${t("result_frequency")}</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((r) => {
              const v = currentMetric === "field" ? r.total : r.perRai;
              const isBest = best && r === best;
              return `
              <tr class="${r.mine ? "is-mine" : ""} ${isBest ? "is-top" : ""}">
                <td class="cmp-cond">
                  <div class="cmp-cond-name">
                    ${escapeHtml(r.label)}
                    ${r.mine ? `<span class="cmp-badge mine">${t("compare_your_match")}</span>` : ""}
                    ${isBest ? `<span class="cmp-badge top">★ ${t("cmp_best_badge")}</span>` : ""}
                  </div>
                  <div class="cmp-cond-tags">
                    ${tag(labelFor("planting", r.s.planting_season), r.changed === "planting" ? "green" : "")}
                    ${tag(labelFor("irrigation", r.s.irrigation_type), r.changed === "water" ? "blue" : "")}
                    ${tag(labelFor("nitrogen", r.s.nitrogen), r.changed === "nitrogen" ? (r.s.nitrogen === "applied" ? "green" : "red") : "")}
                  </div>
                </td>
                <td class="num" data-label="${t("cmp_col_yield")}">
                  <span class="cmp-yield">${fmt(v, digits)}</span> <span class="cmp-unit">${unit}</span>
                  <div class="cmp-mini-bar"><span style="width:${Math.max((r.perRai / maxPerRai(allRows)) * 100, 3)}%"></span></div>
                </td>
                <td class="num" data-label="${t("compare_col_diff")}">${r.mine ? `<span class="cmp-diff base">${t("cmp_baseline")}</span>` : diffPill(r.diff, digits, unit, currentMetric === "field" ? base * area : base)}</td>
                <td class="txt" data-label="${t("result_fertilizer")}"><span class="cmp-txt ${r.s.nitrogen === "applied" ? "green" : "grey"}">${icon(r.s.nitrogen === "applied" ? "leaf" : "ban")}${escapeHtml(localized(r.s, "n_fertilizer") || "-")}</span></td>
                <td class="txt" data-label="${t("result_frequency")}"><span class="cmp-txt blue">${icon(r.s.irrigation_type === "system" ? "droplet" : "cloud")}${escapeHtml(localized(r.s, "irrigation_frequency") || "-")}</span></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
      ${rows.length === 1 ? `<p class="cmp-hint">${t("cmp_pick_filter")}</p>` : ""}
    </section>

    <p class="cmp-foot">${icon("info")}${t("compare_note")}</p>
  `;

  root.querySelectorAll(".cmp-filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      const k = btn.dataset.filter;
      activeFilters = activeFilters.includes(k) ? activeFilters.filter((x) => x !== k) : [...activeFilters, k];
      renderPage();
    })
  );
  root.querySelectorAll(".cmp-segment button").forEach((btn) =>
    btn.addEventListener("click", () => {
      currentMetric = btn.dataset.metric;
      renderPage();
    })
  );
}

/* ---------------- pieces ---------------- */

function chip(ico, text) {
  return `<span class="cmp-chip">${icon(ico)}${escapeHtml(text)}</span>`;
}

function tag(text, tone) {
  return `<span class="cmp-tag ${tone ? "changed " + tone : ""}">${escapeHtml(text)}</span>`;
}

function diffPill(diff, digits, unit, base) {
  let cls = diff > 0.005 ? "up" : diff < -0.005 ? "down" : "same";
  if (cls === "down" && base > 0 && Math.abs(diff) / base < 0.3) cls = "warn"; // small drop -> amber
  const arrow = cls === "up" ? "▲" : cls === "same" ? "•" : "▼";
  const sign = cls === "up" ? "+" : "";
  return `<span class="cmp-diff ${cls}">${arrow} ${sign}${fmt(diff, digits)} <small>${unit}</small></span>`;
}

function maxPerRai(rows) {
  return Math.max(...rows.map((r) => r.perRai), 0.1);
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
