/* =========================================================
   input-form.js — logic for input-form.html only
   Handles: selecting toggle-pills, validating the form,
   and "submitting" the farmer's data.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("fieldForm");

  // Every choice-group (province, planting date, irrigation) works the
  // same way: clicking a pill selects it and un-selects its siblings.
  document.querySelectorAll(".choice-group").forEach((group) => {
    group.addEventListener("click", (event) => {
      const pill = event.target.closest(".choice-pill");
      if (!pill) return;
      group.querySelectorAll(".choice-pill").forEach((p) => p.classList.remove("selected"));
      pill.classList.add("selected");
      group.dataset.value = pill.dataset.value;
      group.closest(".field").classList.remove("has-error");
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const areaInput = document.getElementById("cultivatedArea");
    const formData = {
      province: document.getElementById("provinceGroup").dataset.value || "",
      variety: document.getElementById("varietyInput").value.trim(),
      planting_date: document.getElementById("plantingGroup").dataset.value || "",
      irrigation_type: document.getElementById("irrigationGroup").dataset.value || "",
      cultivated_area: Number(areaInput.value),
      submitted_at: new Date().toISOString(),
    };

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    try {
      const result = await submitFarmerInput(formData); // defined in api.js -> POST /api/match
      // result.html / compare.html read this back (best match + all ranked scenarios)
      sessionStorage.setItem("nadee_match_result", JSON.stringify(result));

      const best = result.best;
      const name = getLang() === "th" ? best.name_th : best.name_en || best.name_th;
      showToast(`${name} · ${best.match_percent}%`);

      setTimeout(() => (window.location.href = "result.html"), 700);
    } catch (err) {
      showToast(t("toast_error"));
      submitBtn.disabled = false;
    }
  });

  function validateForm() {
    let isValid = true;

    isValid = requireChoice("provinceGroup") && isValid;
    isValid = requireText("varietyInput") && isValid;
    isValid = requireChoice("plantingGroup") && isValid;
    isValid = requireChoice("irrigationGroup") && isValid;
    isValid = requireNumber("cultivatedArea") && isValid;

    return isValid;
  }

  function requireChoice(groupId) {
    const group = document.getElementById(groupId);
    const field = group.closest(".field");
    const ok = !!group.dataset.value;
    field.classList.toggle("has-error", !ok);
    return ok;
  }

  function requireText(inputId) {
    const input = document.getElementById(inputId);
    const field = input.closest(".field");
    const ok = input.value.trim().length > 0;
    field.classList.toggle("has-error", !ok);
    return ok;
  }

  function requireNumber(inputId) {
    const input = document.getElementById(inputId);
    const field = input.closest(".field");
    const value = Number(input.value);
    const ok = input.value.trim() !== "" && value > 0;
    field.classList.toggle("has-error", !ok);
    return ok;
  }
});