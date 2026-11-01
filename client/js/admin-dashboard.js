/* =========================================================
   admin-dashboard.js — logic for admin-dashboard.html only
   Handles: auth guard, summary cards, variety filter, the
   scenario list, Add / Edit modal (with dry -> fresh yield
   auto-calculation), Delete confirm, and "reset to research data".
   ========================================================= */

let editingScenarioId = null; // null = "Add" mode, a number = "Edit" mode
let deletingScenarioId = null;
let confirmMode = "delete";   // "delete" | "reset"
let allScenarios = [];
let currentVariety = "all";

const VARIETIES = ["KU50", "RY9", "RY11", "CMR38"];

// [input element id, scenario field]
const FORM_FIELDS = [
  ["varietyInput", "variety"],
  ["plantingInput", "planting_season"],
  ["irrigationInput", "irrigation_type"],
  ["nitrogenInput", "nitrogen"],
  ["dryInput", "yield_dry_kg_ha"],
  ["dmcInput", "dmc_pct"],
  ["yieldInput", "predicted_yield"],
  ["sdInput", "yield_sd"],
  ["nameThInput", "name_th"],
  ["nameEnInput", "name_en"],
  ["descriptionInput", "description"],
  ["descriptionEnInput", "description_en"],
  ["frequencyInput", "irrigation_frequency"],
  ["frequencyEnInput", "irrigation_frequency_en"],
  ["nFertilizerInput", "n_fertilizer"],
  ["nFertilizerEnInput", "n_fertilizer_en"],
  ["scheduleInput", "weekly_schedule"],
  ["scheduleEnInput", "weekly_schedule_en"],
  ["sourceThInput", "source_th"],
  ["sourceInput", "source"],
];

document.addEventListener("DOMContentLoaded", async () => {
  // ---- Auth guard: only signed-in admins may see this page ----
  if (!isAdminLoggedIn()) {
    window.location.href = "admin-login.html";
    return;
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    adminLogout();
    window.location.href = "index.html";
  });

  document.getElementById("addScenarioBtn").addEventListener("click", () => openScenarioModal(null));
  document.getElementById("resetBtn").addEventListener("click", openResetModal);
  document.getElementById("scenarioForm").addEventListener("submit", handleScenarioFormSubmit);
  document.getElementById("cancelModalBtn").addEventListener("click", closeScenarioModal);
  document.getElementById("closeModalBtn").addEventListener("click", closeScenarioModal);
  document.getElementById("scenarioModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "scenarioModalOverlay") closeScenarioModal();
  });

  // fresh yield (t/rai) = dry (kg/ha) / (DMC/100) / 6.25 rai per ha / 1000 kg per t
  ["dryInput", "dmcInput"].forEach((id) =>
    document.getElementById(id).addEventListener("input", () => {
      const dry = Number(document.getElementById("dryInput").value);
      const dmc = Number(document.getElementById("dmcInput").value);
      if (dry > 0 && dmc > 0) {
        document.getElementById("yieldInput").value = (dry / (dmc / 100) / 6250).toFixed(2);
      }
    })
  );

  document.getElementById("cancelDeleteBtn").addEventListener("click", closeDeleteModal);
  document.getElementById("confirmDeleteBtn").addEventListener("click", handleConfirm);
  document.getElementById("deleteModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "deleteModalOverlay") closeDeleteModal();
  });

  await renderDashboard();
});

/* ---------------- Dashboard ---------------- */

async function renderDashboard() {
  try {
    allScenarios = await getScenarios(); // api.js
  } catch (err) {
    showToast(t("toast_error"));
    return;
  }
  renderSummary(allScenarios);
  renderFilter();
  renderScenarioList();
}

function renderSummary(scenarios) {
  document.getElementById("summaryScenarioCount").textContent = scenarios.length;
  document.getElementById("summaryCropCount").textContent =
    new Set(scenarios.map((s) => s.variety).filter(Boolean)).size;
  const ys = scenarios.map((s) => Number(s.predicted_yield)).filter((n) => n > 0);
  document.getElementById("summaryYieldRange").textContent = ys.length
    ? `${fmt(Math.min(...ys))}–${fmt(Math.max(...ys))}`
    : "-";
}

function renderFilter() {
  const el = document.getElementById("varietyFilter");
  if (allScenarios.length === 0) {
    el.innerHTML = "";
    return;
  }
  const count = (v) => allScenarios.filter((s) => v === "all" || s.variety === v).length;
  el.innerHTML = ["all", ...VARIETIES]
    .map(
      (v) => `<button type="button" class="adm-filter ${v === currentVariety ? "on" : ""}" data-v="${v}">
        ${v === "all" ? t("admin_filter_all") : t("variety_" + v)} <span>${count(v)}</span></button>`
    )
    .join("");
  el.querySelectorAll(".adm-filter").forEach((b) =>
    b.addEventListener("click", () => {
      currentVariety = b.dataset.v;
      renderFilter();
      renderScenarioList();
    })
  );
}

function renderScenarioList() {
  const listEl = document.getElementById("scenarioList");

  if (allScenarios.length === 0) {
    listEl.innerHTML = `
      <div class="adm-empty">
        <p>${t("admin_empty")}</p>
        <button type="button" class="btn-cta" id="seedBtn">${icon("sparkles")}<span>${t("admin_seed_btn")}</span></button>
      </div>`;
    document.getElementById("seedBtn").addEventListener("click", handleSeed);
    return;
  }

  const order = { early: 0, late: 1, rain_fed: 0, system: 1, not_applied: 0, applied: 1 };
  const rows = allScenarios
    .filter((s) => currentVariety === "all" || s.variety === currentVariety)
    .sort(
      (a, b) =>
        VARIETIES.indexOf(a.variety) - VARIETIES.indexOf(b.variety) ||
        order[a.planting_season] - order[b.planting_season] ||
        order[a.irrigation_type] - order[b.irrigation_type] ||
        order[a.nitrogen] - order[b.nitrogen]
    );

  listEl.innerHTML = `
    <div class="adm-table-card">
      <table class="adm-table">
        <thead>
          <tr>
            <th>${t("admin_col_scenario")}</th>
            <th class="num">${t("admin_col_yield")}</th>
            <th class="num">${t("admin_col_dry")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (s) => `
            <tr>
              <td>
                <div class="adm-name">${escapeHtml(t("variety_" + s.variety) || s.variety || "-")}</div>
                <div class="adm-tags">
                  <span class="cmp-tag">${icon("calendar")}${escapeHtml(label("planting", s.planting_season))}</span>
                  <span class="cmp-tag">${icon("droplet")}${escapeHtml(label("irrigation", s.irrigation_type))}</span>
                  <span class="cmp-tag ${s.nitrogen === "applied" ? "changed green" : ""}">${icon("leaf")}${escapeHtml(label("nitrogen", s.nitrogen))}</span>
                </div>
              </td>
              <td class="num" data-label="${t("admin_col_yield")}"><b class="adm-yield">${fmt(s.predicted_yield, 2)}</b>${
                s.yield_sd ? `<small> ±${fmt(s.yield_sd, 2)}</small>` : ""
              }</td>
              <td class="num" data-label="${t("admin_col_dry")}">${s.yield_dry_kg_ha ? fmt(s.yield_dry_kg_ha, 0) : "-"}<small>${
                s.dmc_pct ? ` · DMC ${fmt(s.dmc_pct)}%` : ""
              }</small></td>
              <td class="adm-actions">
                <button class="adm-icon-btn edit" data-id="${s.scenario_id}" aria-label="edit">${icon("edit")}</button>
                <button class="adm-icon-btn delete" data-id="${s.scenario_id}" aria-label="delete">${icon("ban")}</button>
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;

  listEl.querySelectorAll(".adm-icon-btn.edit").forEach((btn) =>
    btn.addEventListener("click", () => openScenarioModal(Number(btn.dataset.id)))
  );
  listEl.querySelectorAll(".adm-icon-btn.delete").forEach((btn) =>
    btn.addEventListener("click", () => openDeleteModal(Number(btn.dataset.id)))
  );
}

/* ---------------- Add / Edit modal ---------------- */

function openScenarioModal(scenarioId) {
  editingScenarioId = scenarioId;
  const form = document.getElementById("scenarioForm");
  form.reset();
  document.getElementById("scenarioModalTitle").textContent =
    scenarioId === null ? t("modal_add_title") : t("modal_edit_title");

  if (scenarioId !== null) {
    const scenario = allScenarios.find((s) => s.scenario_id === scenarioId);
    if (scenario) {
      FORM_FIELDS.forEach(([inputId, key]) => {
        document.getElementById(inputId).value = scenario[key] ?? "";
      });
    }
  } else if (currentVariety !== "all") {
    document.getElementById("varietyInput").value = currentVariety;
  }
  document.getElementById("scenarioModalOverlay").classList.remove("hidden");
}

function closeScenarioModal() {
  document.getElementById("scenarioModalOverlay").classList.add("hidden");
  editingScenarioId = null;
}

async function handleScenarioFormSubmit(event) {
  event.preventDefault();
  const data = { province: "khon_kaen" };
  FORM_FIELDS.forEach(([inputId, key]) => {
    data[key] = document.getElementById(inputId).value.trim();
  });

  // auto-fill the name if left empty
  if (!data.name_th) {
    data.name_th = [t_th("variety_" + data.variety), labelTh("planting", data.planting_season),
      labelTh("irrigation", data.irrigation_type), labelTh("nitrogen", data.nitrogen)].join(" · ");
  }

  // the 4 conditions must be unique, otherwise the farmer's match would be ambiguous
  const duplicate = allScenarios.find(
    (s) =>
      s.scenario_id !== editingScenarioId &&
      s.variety === data.variety &&
      s.planting_season === data.planting_season &&
      s.irrigation_type === data.irrigation_type &&
      s.nitrogen === data.nitrogen
  );
  if (duplicate) {
    showToast(t("toast_duplicate"));
    return;
  }
  if (!(Number(data.predicted_yield) > 0)) {
    showToast(t("toast_need_yield"));
    document.getElementById("yieldInput").focus();
    return;
  }

  const btn = document.getElementById("saveModalBtn");
  btn.disabled = true;
  try {
    if (editingScenarioId === null) {
      await addScenario(data);
      showToast(t("toast_added"));
    } else {
      await updateScenario(editingScenarioId, data);
      showToast(t("toast_updated"));
    }
    closeScenarioModal();
    await renderDashboard();
  } catch (err) {
    showToast(err && /already exists/.test(err.message) ? t("toast_duplicate") : t("toast_error"));
  } finally {
    btn.disabled = false;
    document.getElementById("resetBtn").disabled = false;
  }
}

/* ---------------- Confirm modal: delete one / reset all ---------------- */

function openDeleteModal(scenarioId) {
  confirmMode = "delete";
  deletingScenarioId = scenarioId;
  const s = allScenarios.find((x) => x.scenario_id === scenarioId);
  document.getElementById("confirmTitle").textContent = t("modal_delete_title");
  document.getElementById("confirmDeleteBtn").textContent = t("modal_delete_confirm");
  document.getElementById("deleteModalBody").textContent =
    t("modal_delete_body_prefix") + (s ? nameFor(s) : "") + t("modal_delete_body_suffix");
  document.getElementById("deleteModalOverlay").classList.remove("hidden");
}

function openResetModal() {
  if (document.getElementById("resetBtn").disabled) return;
  confirmMode = "reset";
  document.getElementById("confirmTitle").textContent = t("admin_reset_title");
  document.getElementById("confirmDeleteBtn").textContent = t("admin_reset_confirm");
  document.getElementById("deleteModalBody").textContent = t("admin_reset_body");
  document.getElementById("deleteModalOverlay").classList.remove("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModalOverlay").classList.add("hidden");
  deletingScenarioId = null;
}

async function handleConfirm() {
  const btn = document.getElementById("confirmDeleteBtn");
  btn.disabled = true;
  try {
    if (confirmMode === "reset") {
      document.getElementById("resetBtn").disabled = true;
      await resetScenarios(); // api.js — one request on the server, never duplicates
      showToast(t("toast_reset"));
    } else if (deletingScenarioId !== null) {
      await deleteScenario(deletingScenarioId);
      showToast(t("toast_deleted"));
    }
    closeDeleteModal();
    currentVariety = "all";
    await renderDashboard();
  } catch (err) {
    showToast(err && /already exists/.test(err.message) ? t("toast_duplicate") : t("toast_error"));
  } finally {
    btn.disabled = false;
    document.getElementById("resetBtn").disabled = false;
  }
}

/* ---------------- Load research dataset ---------------- */

async function handleSeed() {
  const btn = document.getElementById("seedBtn");
  btn.disabled = true;
  try {
    await seedScenarios(); // api.js
    showToast(t("toast_seeded"));
    await renderDashboard();
  } catch (err) {
    showToast(t("toast_error"));
    btn.disabled = false;
  }
}

/* ---------------- helpers ---------------- */

const LABEL_KEYS = {
  planting: { early: "form_planting_early", late: "form_planting_late" },
  irrigation: { rain_fed: "irrigation_short_rain", system: "irrigation_short_system" },
  nitrogen: { applied: "chip_n_applied", not_applied: "chip_n_none" },
};

function label(kind, value) {
  const key = LABEL_KEYS[kind] && LABEL_KEYS[kind][value];
  return key ? t(key) : value || "-";
}

/** Thai text regardless of the current UI language (used for the default Thai name) */
function t_th(key) {
  return (TRANSLATIONS.th && TRANSLATIONS.th[key]) || key;
}
function labelTh(kind, value) {
  const key = LABEL_KEYS[kind] && LABEL_KEYS[kind][value];
  return key ? t_th(key) : value || "";
}

function nameFor(scenario) {
  return getLang() === "th" ? scenario.name_th : scenario.name_en || scenario.name_th;
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
