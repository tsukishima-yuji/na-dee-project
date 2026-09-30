/* =========================================================
   admin-dashboard.js — logic for admin-dashboard.html only
   Handles: auth guard, rendering the scenario list + summary
   cards, and the Add / Edit / Delete-confirm modals.
   ========================================================= */

let editingScenarioId = null; // null = "Add" mode, a number = "Edit" mode
let deletingScenarioId = null;

// [input element id, scenario field] — same order as the modal
const FORM_FIELDS = [
  ["nameThInput", "name_th"],
  ["nameEnInput", "name_en"],
  ["descriptionInput", "description"],
  ["provinceInput", "province"],
  ["varietyInput", "variety"],
  ["plantingInput", "planting_season"],
  ["irrigationInput", "irrigation_type"],
  ["yieldInput", "predicted_yield"],
  ["waterInput", "water_allocation_week"],
  ["wueInput", "water_use_efficiency"],
  ["nFertilizerInput", "n_fertilizer"],
  ["frequencyInput", "irrigation_frequency"],
  ["scheduleInput", "weekly_schedule"],
  ["sourceInput", "source"],
  ["descriptionEnInput", "description_en"],
  ["frequencyEnInput", "irrigation_frequency_en"],
  ["scheduleEnInput", "weekly_schedule_en"],
  ["nFertilizerEnInput", "n_fertilizer_en"],
  ["sourceThInput", "source_th"],
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
  document.getElementById("scenarioForm").addEventListener("submit", handleScenarioFormSubmit);
  document.getElementById("cancelModalBtn").addEventListener("click", closeScenarioModal);
  document.getElementById("scenarioModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "scenarioModalOverlay") closeScenarioModal();
  });

  document.getElementById("cancelDeleteBtn").addEventListener("click", closeDeleteModal);
  document.getElementById("confirmDeleteBtn").addEventListener("click", handleConfirmDelete);
  document.getElementById("deleteModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "deleteModalOverlay") closeDeleteModal();
  });

  await renderDashboard();
});

async function renderDashboard() {
  const scenarios = await getScenarios(); // api.js
  renderSummary(scenarios);
  renderScenarioList(scenarios);
}

function renderSummary(scenarios) {
  document.getElementById("summaryScenarioCount").textContent = scenarios.length;
  document.getElementById("summaryProvinceCount").textContent =
    new Set(scenarios.map((s) => s.province)).size;
  document.getElementById("summaryCropCount").textContent = new Set(
    scenarios.flatMap((s) =>
      String(s.variety || "")
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v && !/^[a-z]/i.test(v)) // count Thai names only, skip English aliases
    )
  ).size;
}

function nameFor(scenario) {
  return getLang() === "th" ? scenario.name_th : (scenario.name_en || scenario.name_th);
}

function renderScenarioList(scenarios) {
  const listEl = document.getElementById("scenarioList");
  listEl.innerHTML = "";

  if (scenarios.length === 0) {
    listEl.innerHTML = `
      <p class="empty-state">${t("admin_empty")}</p>
      <button type="button" class="btn-primary seed-btn" id="seedBtn">${t("admin_seed_btn")}</button>`;
    document.getElementById("seedBtn").addEventListener("click", handleSeed);
    return;
  }

  scenarios.forEach((scenario) => {
    const card = document.createElement("div");
    card.className = "scenario-card";
    card.innerHTML = `
      <div>
        <div class="scenario-name">${escapeHtml(nameFor(scenario))}</div>
        <div class="scenario-sub">${escapeHtml(provinceLabel(scenario.province))} · ${escapeHtml(irrigationLabel(scenario.irrigation_type))} · ${escapeHtml(formatNum(scenario.predicted_yield))} ${t("unit_ton_rai")}</div>
      </div>
      <div class="scenario-card-actions">
        <button class="icon-btn edit" data-id="${scenario.scenario_id}" aria-label="edit">✎</button>
        <button class="icon-btn delete" data-id="${scenario.scenario_id}" aria-label="delete">🗑</button>
      </div>`;
    listEl.appendChild(card);
  });

  listEl.querySelectorAll(".icon-btn.edit").forEach((btn) =>
    btn.addEventListener("click", () => openScenarioModal(Number(btn.dataset.id)))
  );
  listEl.querySelectorAll(".icon-btn.delete").forEach((btn) =>
    btn.addEventListener("click", () => openDeleteModal(Number(btn.dataset.id)))
  );
}

/* ---------------- Add / Edit modal ---------------- */

async function openScenarioModal(scenarioId) {
  editingScenarioId = scenarioId;
  const modalTitle = document.getElementById("scenarioModalTitle");
  const form = document.getElementById("scenarioForm");
  form.reset();

  if (scenarioId === null) {
    modalTitle.textContent = t("modal_add_title");
  } else {
    modalTitle.textContent = t("modal_edit_title");
    const scenarios = await getScenarios();
    const scenario = scenarios.find((s) => s.scenario_id === scenarioId);
    if (scenario) {
      FORM_FIELDS.forEach(([inputId, key]) => {
        document.getElementById(inputId).value = scenario[key] ?? "";
      });
    }
  }
  document.getElementById("scenarioModalOverlay").classList.remove("hidden");
}

function closeScenarioModal() {
  document.getElementById("scenarioModalOverlay").classList.add("hidden");
  editingScenarioId = null;
}

async function handleScenarioFormSubmit(event) {
  event.preventDefault();
  const data = {};
  FORM_FIELDS.forEach(([inputId, key]) => {
    data[key] = document.getElementById(inputId).value.trim();
  });
  if (!data.name_th || !data.province) {
    showToast(t("toast_error"));
    return;
  }

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
    showToast(t("toast_error"));
  }
}

/* ---------------- Delete-confirm modal ---------------- */

async function openDeleteModal(scenarioId) {
  deletingScenarioId = scenarioId;
  const scenarios = await getScenarios();
  const scenario = scenarios.find((s) => s.scenario_id === scenarioId);
  document.getElementById("deleteModalBody").textContent =
    t("modal_delete_body_prefix") + (scenario ? nameFor(scenario) : "") + t("modal_delete_body_suffix");
  document.getElementById("deleteModalOverlay").classList.remove("hidden");
}

function closeDeleteModal() {
  document.getElementById("deleteModalOverlay").classList.add("hidden");
  deletingScenarioId = null;
}

async function handleConfirmDelete() {
  if (deletingScenarioId === null) return;
  try {
    await deleteScenario(deletingScenarioId);
    showToast(t("toast_deleted"));
    closeDeleteModal();
    await renderDashboard();
  } catch (err) {
    showToast(t("toast_error"));
  }
}

function provinceLabel(code) {
  const keys = { khon_kaen: "form_province_kk", udon_thani: "form_province_ud" };
  return keys[code] ? t(keys[code]) : code;
}

function irrigationLabel(code) {
  const keys = { rain_fed: "irrigation_short_rain", system: "irrigation_short_system" };
  return keys[code] ? t(keys[code]) : "-";
}

function formatNum(n) {
  return n || n === 0 ? String(n) : "-";
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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}