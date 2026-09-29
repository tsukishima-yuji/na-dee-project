/* =========================================================
   main.js
   Shared logic loaded on EVERY page:
   1. Thai / English text switching (data-i18n attributes)
   2. Highlighting the active icon in the bottom nav
   3. A small toast() helper other scripts can reuse
   =========================================================

   HOW THE LANGUAGE SWITCH WORKS
   - All translatable text lives in the TRANSLATIONS object below.
     It is the exact same content as /assets/lang/th.json and
     /assets/lang/en.json — kept here as a plain JS object so the
     pages work even when opened directly as a file (no local
     server needed). If/when the app is served from Netlify,
     could instead `fetch('/assets/lang/th.json')`; the JSON files
     are already there and ready for that swap.
   - Any element that should change language gets:
       <span data-i18n="home_cta"></span>
     or, for placeholders:
       <input data-i18n-placeholder="form_area_placeholder">
   - applyLanguage() loops over those elements and fills them in.
*/

const TRANSLATIONS = {
  th: {
    brand: "นาดี", role_farmer: "เกษตรกร", admin_btn: "Admin",
    home_eyebrow: "ขอนแก่น · อุดรธานี",
    home_title: "เลือกแนวทางการจัดการน้ำสำหรับมันสำปะหลังของคุณ",
    home_desc: "เลือกจังหวัด พันธุ์ วันที่ปลูก และวิธีการให้น้ำ ระบบจะจับคู่กับสถานการณ์ที่ใกล้เคียงที่สุด และคาดการณ์ผลผลิตให้ทันที",
    home_cta: "เริ่มกรอกข้อมูล",
    stat_scenarios: "Scenario หลัก", stat_provinces: "พื้นที่รับ", stat_areas: "จังหวัด",
    home_section_title: "4 แนวทางการจัดการหลัก",
    scenario_1_name: "เกษตรกรรายย่อย", scenario_1_sub: "ต้นทุนต่ำ · พึ่งน้ำฝน", scenario_1_badge: "ผลผลิตปานกลาง-ต่ำ",
    scenario_2_name: "เพิ่มผลผลิตตามคำแนะนำ", scenario_2_sub: "ใช้น้ำอย่างมีประสิทธิภาพ", scenario_2_badge: "ผลผลิตปานกลาง-สูง",
    scenario_3_name: "เพิ่มผลผลิตสูงสุด", scenario_3_sub: "จัดการครบวงจร", scenario_3_badge: "ผลผลิตสูง",
    scenario_4_name: "เตรียมรับสภาพอากาศแปรปรวน", scenario_4_sub: "พันธุ์ทนแล้ง · Climate resilient", scenario_4_badge: "มั่นคงในอนาคต",
    nav_home: "หน้าแรก", nav_input: "กรอกข้อมูล", nav_compare: "เปรียบเทียบ", nav_admin: "รายงาน",
    form_title: "ข้อมูลแปลงของคุณ", form_province: "จังหวัด",
    form_province_kk: "ขอนแก่น", form_province_ud: "อุดรธานี",
    form_variety: "พันธุ์มันสำปะหลัง", form_variety_placeholder: "เกษตรศาสตร์ 50",
    form_planting_date: "วันปลูก",
    form_planting_early: "ต้นฤดูฝน (พ.ค.-มิ.ย.)", form_planting_late: "ปลายฤดูฝน (ต.ค.-พ.ย.)",
    form_irrigation: "การให้น้ำ",
    form_irrigation_rain: "อาศัยน้ำฝน (ไม่ให้น้ำเพิ่ม)", form_irrigation_system: "ให้น้ำตามคำแนะนำระบบ",
    form_area: "ขนาดพื้นที่เพาะปลูก (ไร่)", form_area_placeholder: "เช่น 8",
    form_next: "ต่อไป", form_error_required: "กรุณากรอกข้อมูลนี้", form_error_number: "กรุณากรอกตัวเลขที่มากกว่า 0",
    form_submitted_toast: "บันทึกข้อมูลแปลงเรียบร้อยแล้ว",
    login_title: "เข้าสู่ระบบผู้ดูแล", login_subtitle: "สำหรับผู้จัดการข้อมูล",
    login_email: "อีเมล", login_password: "รหัสผ่าน", login_button: "เข้าสู่ระบบ",
    login_error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", login_back: "กลับหน้าแรก",
    admin_all_scenarios: "Scenario ทั้งหมด", admin_add: "เพิ่ม",
    admin_summary_title: "สรุประบบ", admin_summary_scenario: "Scenario",
    admin_summary_province: "จังหวัด", admin_summary_crop: "พันธุ์",
    admin_logout: "ออกจากระบบ", admin_empty: "ยังไม่มี Scenario กรุณาเพิ่มรายการใหม่",
    modal_add_title: "เพิ่ม Scenario ใหม่", modal_edit_title: "แก้ไข Scenario",
    modal_name_label: "ชื่อ Scenario", modal_name_placeholder: "เช่น เกษตรกรรายย่อย — พึ่งน้ำฝน",
    modal_water_label: "น้ำ (ลบ.ม./ไร่/สัปดาห์)", modal_water_placeholder: "เช่น 14",
    modal_frequency_label: "ความถี่การให้น้ำ", modal_frequency_placeholder: "เช่น ครั้งละ 24 ลบ.ม./ไร่ ทุก 12 วัน",
    modal_province_label: "จังหวัด",
    modal_cancel: "ยกเลิก", modal_save: "บันทึก",
    modal_delete_title: "ยืนยันการลบ Scenario",
    modal_delete_body_prefix: 'การลบไม่สามารถย้อนกลับได้ ต้องการลบ "', modal_delete_body_suffix: '" ใช่หรือไม่?',
    modal_delete_confirm: "ลบ Scenario",
    toast_added: "เพิ่ม Scenario เรียบร้อยแล้ว", toast_updated: "บันทึกการแก้ไขเรียบร้อยแล้ว",
    toast_deleted: "ลบ Scenario เรียบร้อยแล้ว", toast_error: "เกิดข้อผิดพลาด กรุณาลองใหม่",
    // --- scenario schema / matching ---
    modal_section_info: "ข้อมูลทั่วไป", modal_section_match: "เงื่อนไขการจับคู่", modal_section_output: "ผลลัพธ์ / คำแนะนำ",
    modal_name_en_label: "ชื่อภาษาอังกฤษ", modal_description_label: "คำอธิบาย",
    modal_variety_label: "พันธุ์ (คั่นด้วย , )", modal_yield_label: "ผลผลิต (ตัน/ไร่)",
    modal_wue_label: "WUE (กก./ลบ.ม.)", modal_n_label: "ปุ๋ยไนโตรเจน",
    modal_schedule_label: "ตารางให้น้ำรายสัปดาห์", modal_source_label: "แหล่งอ้างอิงข้อมูล",
    admin_seed_btn: "โหลดข้อมูลจากงานวิจัย (8 Scenario)", toast_seeded: "โหลดข้อมูล Scenario เรียบร้อยแล้ว",
    irrigation_short_rain: "พึ่งน้ำฝน", irrigation_short_system: "ให้น้ำ", unit_ton_rai: "ตัน/ไร่",
    // --- result / compare pages ---
    unit_rai: "ไร่", unit_m3_rai_week: "ลบ.ม./ไร่/สัปดาห์", unit_kg_m3: "กก./ลบ.ม.",
    result_empty: "ยังไม่มีผลการวิเคราะห์ กรอกข้อมูลแปลงเพื่อรับคำแนะนำ",
    result_eyebrow: "แนวทางที่เหมาะกับแปลงของคุณ",
    result_outputs_title: "ผลที่คาดการณ์ทั้งแปลง", result_total_yield: "ผลผลิต (ตัน)", result_total_water: "น้ำ (ลบ.ม./สัปดาห์)",
    result_advice_title: "คำแนะนำการจัดการน้ำ", result_frequency: "ความถี่การให้น้ำ", result_schedule: "ตารางให้น้ำ",
    result_fertilizer: "ปุ๋ยไนโตรเจน", result_variety: "พันธุ์ที่ใช้ในข้อมูลอ้างอิง",
    result_why_title: "ทำไมถึงได้แนวทางนี้", result_other_title: "แนวทางอื่นในจังหวัดเดียวกัน",
    result_source: "แหล่งข้อมูล", result_compare_btn: "เปรียบเทียบทุก Scenario", result_again_btn: "กรอกข้อมูลใหม่",
    compare_title: "เปรียบเทียบ Scenario", compare_desc: "เทียบผลผลิตและการใช้น้ำของทุกแนวทางในจังหวัดเดียวกัน",
    compare_loading: "กำลังโหลดข้อมูล...", compare_empty: "ยังไม่มี Scenario ของจังหวัดนี้",
    compare_chart_title: "กราฟเปรียบเทียบ", compare_table_title: "ตารางเปรียบเทียบ",
    compare_metric_yield: "ผลผลิต", compare_metric_water: "น้ำ/สัปดาห์", compare_metric_wue: "WUE",
    compare_your_match: "ของคุณ", compare_note: "WUE = ผลผลิตต่อปริมาณน้ำที่ใช้ทั้งหมด ยิ่งสูงยิ่งใช้น้ำคุ้มค่า"
  },
  en: {
    brand: "Na-Dee", role_farmer: "Farmer", admin_btn: "Admin",
    home_eyebrow: "Khon Kaen · Udon Thani",
    home_title: "Choose a water management approach for your cassava field",
    home_desc: "Select your province, variety, planting date, and irrigation method. The system will match it with the closest scenario and instantly predict the yield.",
    home_cta: "Start entering your data",
    stat_scenarios: "Scenarios", stat_provinces: "Areas", stat_areas: "Provinces",
    home_section_title: "4 main management approaches",
    scenario_1_name: "Smallholder farmer", scenario_1_sub: "Low cost · rain-fed", scenario_1_badge: "Medium-low yield",
    scenario_2_name: "Boost yield with guidance", scenario_2_sub: "Efficient water use", scenario_2_badge: "Medium-high yield",
    scenario_3_name: "Maximize yield", scenario_3_sub: "Full management", scenario_3_badge: "High yield",
    scenario_4_name: "Climate resilience prep", scenario_4_sub: "Drought-tolerant · climate resilient", scenario_4_badge: "Future-proof",
    nav_home: "Home", nav_input: "Input form", nav_compare: "Compare", nav_admin: "Report",
    form_title: "Your field information", form_province: "Province",
    form_province_kk: "Khon Kaen", form_province_ud: "Udon Thani",
    form_variety: "Cassava variety", form_variety_placeholder: "Kasetsart 50",
    form_planting_date: "Planting date",
    form_planting_early: "Early rainy season (May-Jun)", form_planting_late: "Late rainy season (Oct-Nov)",
    form_irrigation: "Irrigation",
    form_irrigation_rain: "Rain-fed (no extra water)", form_irrigation_system: "Follow system recommendation",
    form_area: "Cultivated area (rai)", form_area_placeholder: "e.g. 8",
    form_next: "Next", form_error_required: "This field is required", form_error_number: "Please enter a number greater than 0",
    form_submitted_toast: "Your field data was saved",
    login_title: "Admin sign in", login_subtitle: "For data managers",
    login_email: "Email", login_password: "Password", login_button: "Sign in",
    login_error: "Incorrect email or password", login_back: "Back to home",
    admin_all_scenarios: "All scenarios", admin_add: "Add",
    admin_summary_title: "System summary", admin_summary_scenario: "Scenarios",
    admin_summary_province: "Provinces", admin_summary_crop: "Varieties",
    admin_logout: "Log out", admin_empty: "No scenarios yet. Add a new one to get started.",
    modal_add_title: "Add new scenario", modal_edit_title: "Edit scenario",
    modal_name_label: "Scenario name", modal_name_placeholder: "e.g. Smallholder farmer — rain-fed",
    modal_water_label: "Water (m³/rai/week)", modal_water_placeholder: "e.g. 14",
    modal_frequency_label: "Irrigation frequency", modal_frequency_placeholder: "e.g. 24 m³/rai every 12 days",
    modal_province_label: "Province",
    modal_cancel: "Cancel", modal_save: "Save",
    modal_delete_title: "Confirm delete scenario",
    modal_delete_body_prefix: 'This cannot be undone. Delete "', modal_delete_body_suffix: '"?',
    modal_delete_confirm: "Delete scenario",
    toast_added: "Scenario added", toast_updated: "Changes saved",
    toast_deleted: "Scenario deleted", toast_error: "Something went wrong, please try again",
    // --- scenario schema / matching ---
    modal_section_info: "General info", modal_section_match: "Matching conditions", modal_section_output: "Outputs / recommendation",
    modal_name_en_label: "English name", modal_description_label: "Description",
    modal_variety_label: "Varieties (comma-separated)", modal_yield_label: "Yield (t/rai)",
    modal_wue_label: "WUE (kg/m³)", modal_n_label: "Nitrogen fertilizer",
    modal_schedule_label: "Weekly irrigation schedule", modal_source_label: "Data source / reference",
    admin_seed_btn: "Load research dataset (8 scenarios)", toast_seeded: "Scenario dataset loaded",
    irrigation_short_rain: "Rain-fed", irrigation_short_system: "Irrigated", unit_ton_rai: "t/rai",
    // --- result / compare pages ---
    unit_rai: "rai", unit_m3_rai_week: "m³/rai/week", unit_kg_m3: "kg/m³",
    result_empty: "No result yet. Fill in your field information to get a recommendation.",
    result_eyebrow: "Best approach for your field",
    result_outputs_title: "Predicted for your whole field", result_total_yield: "Yield (tons)", result_total_water: "Water (m³/week)",
    result_advice_title: "Water management advice", result_frequency: "Irrigation frequency", result_schedule: "Irrigation schedule",
    result_fertilizer: "Nitrogen fertilizer", result_variety: "Varieties in reference data",
    result_why_title: "Why this approach", result_other_title: "Other approaches in this province",
    result_source: "Data source", result_compare_btn: "Compare all scenarios", result_again_btn: "Enter new data",
    compare_title: "Compare scenarios", compare_desc: "Yield and water use of every approach in the same province",
    compare_loading: "Loading...", compare_empty: "No scenarios for this province yet",
    compare_chart_title: "Comparison chart", compare_table_title: "Comparison table",
    compare_metric_yield: "Yield", compare_metric_water: "Water/week", compare_metric_wue: "WUE",
    compare_your_match: "Yours", compare_note: "WUE = yield per unit of total water used; higher means more yield per drop"
  }
};

/** Read the saved language, defaulting to Thai (the app's primary language). */
function getLang() {
  return localStorage.getItem("nadee_lang") || "th";
}

/** Look up one translated string for the current language. Used by page scripts too. */
function t(key) {
  const lang = getLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key;
}

/** Fill in every element on the page that asks for translated text. */
function applyLanguage() {
  const lang = getLang();
  const dict = TRANSLATIONS[lang];
  document.documentElement.lang = lang === "th" ? "th" : "en";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key] !== undefined) el.setAttribute("placeholder", dict[key]);
  });

  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) langBtn.textContent = lang === "th" ? "ไทย / EN" : "EN / ไทย";
}

/** Flip th <-> en, save the choice, and re-render the current page's text. */
function toggleLanguage() {
  const next = getLang() === "th" ? "en" : "th";
  localStorage.setItem("nadee_lang", next);
  applyLanguage();
}

function toggleLanguage() {
  const next = getLang() === "th" ? "en" : "th";
  localStorage.setItem("nadee_lang", next);
  applyLanguage();
  if (typeof renderDashboard === "function") renderDashboard();
  if (typeof renderPage === "function") renderPage(); // result.html / compare.html
}

/** Show a small message at the bottom of the screen for a couple of seconds. */
function showToast(message) {
  let toastEl = document.getElementById("globalToast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "globalToast";
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

/** Mark the bottom-nav icon for the current page as active. */
function highlightActiveNav() {
  const page = document.body.getAttribute("data-page");
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.getAttribute("data-nav") === page);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyLanguage();
  highlightActiveNav();

  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) langBtn.addEventListener("click", toggleLanguage);

  // The header "Admin" pill always sends people to the admin area:
  // straight to the dashboard if already signed in, otherwise to login.
  const adminBtn = document.getElementById("adminEntryBtn");
  if (adminBtn) {
    adminBtn.addEventListener("click", () => {
      window.location.href = isAdminLoggedIn() ? "admin-dashboard.html" : "admin-login.html";
    });
  }
});