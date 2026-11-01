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
    variety_KU50: "เกษตรศาสตร์ 50",
    variety_RY9: "ระยอง 9",
    variety_RY11: "ระยอง 11",
    variety_CMR38: "CMR38-125-77",
    unit_ton: "ตัน",
    chip_n_applied: "ใส่ปุ๋ย N",
    chip_n_none: "ไม่ใส่ปุ๋ย N",
    result_for_field: "แปลง",
    result_normal_year: "ปีปกติ",
    result_fresh_note: "น้ำหนักหัวมันสด",
    result_level_title: "ระดับผลผลิต",
    level_low: "ต่ำ",
    level_mid: "ปานกลาง",
    level_high: "สูง",
    level_vs_above: "สูงกว่าค่าเฉลี่ยเกษตรกรทั่วไป (3 ตัน/ไร่) ประมาณ",
    level_vs_times: "เท่า",
    level_vs_same: "ใกล้เคียงค่าเฉลี่ยเกษตรกรทั่วไป (3 ตัน/ไร่)",
    level_vs_below: "ต่ำกว่าค่าเฉลี่ยเกษตรกรทั่วไป (3 ตัน/ไร่)",
    result_tip_title: "ทำอย่างไรให้ได้มากขึ้น",
    tip_if: "ถ้า",
    tip_and: "และ",
    tip_add_n: "ใส่ปุ๋ยไนโตรเจน",
    tip_no_n: "ไม่ใส่ปุ๋ยไนโตรเจน",
    tip_add_water: "ให้น้ำเพียงพอ",
    tip_rainfed: "อาศัยน้ำฝน",
    tip_already_best: "แผนของคุณให้ผลผลิตดีที่สุดแล้ว เมื่อเทียบกับการเปลี่ยนทีละอย่าง",
    tip_see_compare: "ดูการเปรียบเทียบทั้งหมด",
    result_source_title: "ตัวเลขนี้มาจากไหน?",
    result_source_model: "คำนวณด้วยแบบจำลองการปลูกมันสำปะหลัง DSSAT ซึ่งกลุ่มวิจัย มข. ทดสอบกับแปลงจริงแล้ว",
    result_source_site: "ใช้ดินทรายและสภาพอากาศจริงย้อนหลัง 29 ปีของพื้นที่ผลิต (ฐานข้อมูลขอนแก่น)",
    result_source_fresh: "แปลงจากน้ำหนักแห้งเป็นน้ำหนักสดด้วย % น้ำหนักแห้งของพันธุ์นี้",
    result_source_potential: "เป็นผลผลิตเมื่อดูแลดี ผลผลิตจริงอาจต่ำกว่านี้จากโรค แมลง หรือวัชพืช",
    compare_metric_per_rai: "ผลผลิตต่อไร่",
    compare_metric_field: "ทั้งแปลง",
    compare_col_diff: "ต่างจากแผนของคุณ",
    compare_need_input: "กรอกข้อมูลแปลงก่อน แล้วระบบจะเปรียบเทียบให้ว่าถ้าเปลี่ยนวิธีจะได้ผลผลิตเท่าไหร่",
    compare_yours_label: "แผนของคุณตอนนี้",
    compare_if_add_n: "ใส่ปุ๋ยไนโตรเจน",
    compare_if_no_n: "ไม่ใส่ปุ๋ยไนโตรเจน",
    compare_if_add_water: "ให้น้ำเพียงพอ",
    compare_if_no_water: "อาศัยน้ำฝนอย่างเดียว",
    compare_if_late: "ปลูกปลายฝน",
    compare_if_early: "ปลูกต้นฝน",
    cmp_base_title: "แผนของคุณ (ตัวตั้งในการเปรียบเทียบ)",
    cmp_filter_title: "เทียบเมื่อเปลี่ยน:",
    cmp_filter_nitrogen: "ปุ๋ย",
    cmp_filter_water: "การให้น้ำ",
    cmp_filter_planting: "วันปลูก",
    cmp_show_as: "แสดงผลผลิต:",
    cmp_col_yield: "ผลผลิต",
    cmp_best_badge: "ได้มากสุด",
    cmp_baseline: "ตัวตั้ง",
    cmp_pick_filter: "เลือกอย่างน้อย 1 ตัวกรองด้านบน เพื่อดูการเปรียบเทียบ",
    feat_1_title: "แบบจำลอง DSSAT",
    feat_1_desc: "แบบจำลองพืชที่ปรับเทียบกับแปลงทดลอง มข.",
    feat_2_title: "คาดการณ์ผลผลิตทันที",
    feat_2_desc: "เทียบอาศัยน้ำฝนกับการให้น้ำ",
    feat_3_title: "ผลของปุ๋ยและน้ำ",
    feat_3_desc: "ดูว่าแต่ละการเปลี่ยนแปลงเพิ่มผลผลิตเท่าไหร่",
    form_area_suffix: "ไร่",
    rec_title: "คำแนะนำที่ทำได้ทันที",
    badge_natural: "ธรรมชาติ",
    badge_managed: "ต้องจัดการ",
    badge_important: "สำคัญ",
    badge_not_applied: "ไม่ใส่",
    badge_selected: "พันธุ์ที่เลือก",
    cmp_sim_pill: "แบบจำลอง DSSAT · เฉลี่ย 29 ปี",
    cmp_base_pill: "ตัวตั้ง",
    brand: "นาดี",
    role_farmer: "เกษตรกร",
    admin_btn: "ผู้ดูแล",
    home_eyebrow: "จำลองการปลูกและคาดการณ์ผลผลิต",
    home_title: "เลือกแนวทางการจัดการน้ำสำหรับมันสำปะหลังของคุณ",
    home_desc: "เลือกพันธุ์ พื้นที่ปลูก วันปลูก การให้น้ำ และปุ๋ยไนโตรเจน ระบบจะคาดการณ์ผลผลิตทั้งแปลงให้ทันที",
    home_cta: "เริ่มกรอกข้อมูล",
    stat_scenarios: "แนวทางหลัก",
    stat_provinces: "พันธุ์",
    stat_areas: "จังหวัด",
    home_section_title: "4 แนวทางการจัดการหลัก",
    scenario_1_name: "เกษตรกรรายย่อย",
    scenario_1_sub: "ต้นทุนต่ำ · พึ่งน้ำฝน",
    scenario_1_badge: "ผลผลิตปานกลาง-ต่ำ",
    scenario_2_name: "เพิ่มผลผลิตตามคำแนะนำ",
    scenario_2_sub: "ใช้น้ำอย่างมีประสิทธิภาพ",
    scenario_2_badge: "ผลผลิตปานกลาง-สูง",
    scenario_3_name: "เพิ่มผลผลิตสูงสุด",
    scenario_3_sub: "จัดการครบวงจร",
    scenario_3_badge: "ผลผลิตสูง",
    scenario_4_name: "เตรียมรับสภาพอากาศแปรปรวน",
    scenario_4_sub: "พันธุ์ทนแล้ง · รับมืออากาศแปรปรวน",
    scenario_4_badge: "มั่นคงในอนาคต",
    nav_home: "หน้าแรก",
    nav_input: "กรอกข้อมูล",
    nav_compare: "เปรียบเทียบ",
    nav_admin: "ผลลัพธ์",
    form_title: "ข้อมูลแปลงของคุณ",
    form_province: "จังหวัด",
    form_area_fixed: "พื้นที่ผลิตมันสำปะหลัง (ขอนแก่น)",
    form_nitrogen: "ปุ๋ยไนโตรเจน",
    form_nitrogen_applied: "ใส่ปุ๋ย",
    form_nitrogen_not_applied: "ไม่ใส่ปุ๋ย",
    form_province_kk: "ขอนแก่น",
    form_province_ud: "อุดรธานี",
    form_variety: "พันธุ์มันสำปะหลัง",
    form_variety_placeholder: "เลือกพันธุ์",
    form_planting_date: "วันปลูก",
    form_planting_early: "ต้นฤดูฝน (พ.ค.-มิ.ย.)",
    form_planting_late: "ปลายฤดูฝน (ต.ค.-พ.ย.)",
    form_irrigation: "การให้น้ำ",
    form_irrigation_rain: "อาศัยน้ำฝน (ไม่ให้น้ำเพิ่ม)",
    form_irrigation_system: "ให้น้ำตามคำแนะนำระบบ",
    form_area: "ขนาดพื้นที่เพาะปลูก (ไร่)",
    form_area_placeholder: "เช่น 8",
    form_next: "ต่อไป",
    form_error_required: "กรุณากรอกข้อมูลนี้",
    form_error_number: "กรุณากรอกตัวเลขที่มากกว่า 0",
    form_submitted_toast: "บันทึกข้อมูลแปลงเรียบร้อยแล้ว",
    login_title: "เข้าสู่ระบบผู้ดูแล",
    login_subtitle: "สำหรับผู้จัดการข้อมูล",
    login_email: "อีเมล",
    login_password: "รหัสผ่าน",
    login_button: "เข้าสู่ระบบ",
    login_error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    login_back: "กลับหน้าแรก",
    admin_all_scenarios: "แนวทางทั้งหมด",
    admin_add: "เพิ่มแนวทาง",
    admin_summary_title: "สรุประบบ",
    admin_summary_scenario: "แนวทาง",
    admin_summary_province: "จังหวัด",
    admin_summary_crop: "พันธุ์",
    admin_logout: "ออกจากระบบ",
    admin_empty: "ยังไม่มีแนวทาง กรุณาเพิ่มรายการใหม่",
    modal_add_title: "เพิ่มแนวทางใหม่",
    modal_edit_title: "แก้ไขแนวทาง",
    modal_name_label: "ชื่อแนวทาง",
    modal_name_placeholder: "เช่น เกษตรกรรายย่อย — พึ่งน้ำฝน",
    modal_water_label: "น้ำ (ลบ.ม./ไร่/สัปดาห์)",
    modal_water_placeholder: "เช่น 14",
    modal_frequency_label: "ความถี่การให้น้ำ (ไทย)",
    modal_frequency_placeholder: "เช่น ครั้งละ 24 ลบ.ม./ไร่ ทุก 12 วัน",
    modal_province_label: "จังหวัด",
    modal_cancel: "ยกเลิก",
    modal_save: "บันทึก",
    modal_delete_title: "ยืนยันการลบแนวทาง",
    modal_delete_body_prefix: "การลบไม่สามารถย้อนกลับได้ ต้องการลบ \"",
    modal_delete_body_suffix: "\" ใช่หรือไม่?",
    modal_delete_confirm: "ลบแนวทาง",
    toast_added: "เพิ่มแนวทางเรียบร้อยแล้ว",
    toast_updated: "บันทึกการแก้ไขเรียบร้อยแล้ว",
    toast_deleted: "ลบแนวทางเรียบร้อยแล้ว",
    toast_error: "เกิดข้อผิดพลาด กรุณาลองใหม่",
    modal_section_info: "ข้อมูลทั่วไป",
    modal_section_match: "เงื่อนไขการจับคู่ (4 อย่าง)",
    modal_section_output: "ผลผลิต",
    modal_name_en_label: "ชื่อภาษาอังกฤษ",
    modal_description_label: "คำอธิบาย (ไทย)",
    modal_variety_label: "พันธุ์ (คั่นด้วย , )",
    modal_yield_label: "ผลผลิตหัวสด (ตัน/ไร่)",
    modal_wue_label: "ประสิทธิภาพการใช้น้ำ (กก./ลบ.ม.)",
    modal_n_label: "ปุ๋ยไนโตรเจน (ไทย)",
    modal_schedule_label: "ตารางให้น้ำ (ไทย)",
    modal_source_label: "แหล่งอ้างอิงข้อมูล (อังกฤษ)",
    modal_section_lang: "ข้อความภาษาอังกฤษ (แสดงเมื่อสลับเป็น EN)",
    modal_description_en_label: "คำอธิบาย (อังกฤษ)",
    modal_frequency_en_label: "ความถี่การให้น้ำ (อังกฤษ)",
    modal_schedule_en_label: "ตารางให้น้ำ (อังกฤษ)",
    modal_n_en_label: "ปุ๋ยไนโตรเจน (อังกฤษ)",
    modal_source_th_label: "แหล่งอ้างอิงข้อมูล (ไทย)",
    modal_name_en_placeholder: "เช่น Smallholder — Rain-fed",
    modal_variety_placeholder: "ห้วยบง 80, ระยอง 11, Huay Bong 80",
    modal_n_placeholder: "14.4 กก.ไนโตรเจน/ไร่",
    admin_seed_btn: "โหลดข้อมูลจากงานวิจัย (32 แนวทาง)",
    toast_seeded: "โหลดข้อมูลแนวทางเรียบร้อยแล้ว",
    irrigation_short_rain: "พึ่งน้ำฝน",
    irrigation_short_system: "ให้น้ำ",
    unit_ton_rai: "ตัน/ไร่",
    unit_rai: "ไร่",
    unit_m3_rai_week: "ลบ.ม./ไร่/สัปดาห์",
    unit_kg_m3: "กก./ลบ.ม.",
    result_empty: "ยังไม่มีผลการวิเคราะห์ กรอกข้อมูลแปลงเพื่อรับคำแนะนำ",
    result_eyebrow: "ผลผลิตรวมที่คาดว่าจะได้",
    result_outputs_title: "ผลที่คาดการณ์ (ต่อไร่)",
    result_total_yield: "ผลผลิต (ตัน)",
    result_total_water: "น้ำ (ลบ.ม./สัปดาห์)",
    result_advice_title: "สิ่งที่ต้องทำ",
    result_frequency: "ความถี่การให้น้ำ",
    result_schedule: "ตารางให้น้ำ",
    result_fertilizer: "ปุ๋ยไนโตรเจน",
    result_variety: "พันธุ์ที่ใช้ในข้อมูลอ้างอิง",
    result_why_title: "ทำไมถึงได้แนวทางนี้",
    result_other_title: "แนวทางอื่นในจังหวัดเดียวกัน",
    result_source: "แหล่งข้อมูล",
    result_compare_btn: "ดูทางเลือกอื่น",
    result_again_btn: "แก้ไขข้อมูลแปลง",
    compare_title: "เปรียบเทียบแนวทาง",
    compare_desc: "เทียบกับแผนของคุณ ถ้าเปลี่ยนทีละอย่าง ผลผลิตจะเปลี่ยนไปเท่าไหร่",
    compare_loading: "กำลังโหลดข้อมูล...",
    compare_empty: "ยังไม่มีข้อมูลของพันธุ์และวันปลูกนี้",
    compare_chart_title: "กราฟเปรียบเทียบ",
    compare_table_title: "ตารางเปรียบเทียบ",
    compare_metric_yield: "ผลผลิต",
    compare_metric_water: "น้ำ/สัปดาห์",
    compare_metric_wue: "ประสิทธิภาพน้ำ",
    compare_col_scenario: "แนวทาง",
    compare_your_match: "แผนปัจจุบัน",
    weather_title: "ปรับตามสภาพอากาศ 7 วันข้างหน้า",
    weather_loading: "กำลังดึงพยากรณ์อากาศ...",
    weather_error: "ดึงพยากรณ์อากาศไม่ได้ในขณะนี้ ใช้ปริมาณน้ำตามข้อมูลงานวิจัยด้านบนแทน",
    weather_rain_caption: "ปริมาณฝนพยากรณ์รายวัน (มม.) และอุณหภูมิสูงสุด",
    weather_rain: "ฝน 7 วัน",
    weather_need: "พืชต้องการน้ำ",
    weather_cover: "ฝนช่วยได้",
    weather_advice_prefix: "สัปดาห์นี้ให้น้ำ",
    weather_total: "ทั้งแปลง",
    weather_advice_skip: "ฝนเพียงพอแล้ว <b>สัปดาห์นี้งดให้น้ำได้</b>",
    weather_advice_rainfed: "แนวทางนี้อาศัยน้ำฝน ใช้พยากรณ์ช่วยวางแผนงานในแปลง",
    weather_saved: "ประหยัดน้ำได้",
    weather_source: "ข้อมูลอากาศจาก Open-Meteo · คำนวณตามวิธีของ FAO (ค่าสัมประสิทธิ์พืช 0.8)",
    unit_mm: "มม.",
    unit_m3: "ลบ.ม.",
    compare_note: "ผลผลิตเป็นน้ำหนักหัวมันสด เฉลี่ยจากสภาพอากาศจริง 29 ปี (แบบจำลอง DSSAT)",
    admin_role: "ผู้ดูแล",
    admin_title: "จัดการแนวทาง",
    admin_subtitle: "ข้อมูลผลผลิตจากแบบจำลอง DSSAT ที่เกษตรกรเห็นในแอป",
    admin_summary_yield: "ช่วงผลผลิต (ตัน/ไร่)",
    admin_filter_all: "ทั้งหมด",
    admin_col_scenario: "เงื่อนไข",
    admin_col_yield: "ผลผลิตหัวสด (ตัน/ไร่)",
    admin_col_dry: "น้ำหนักแห้ง (กก./เฮกตาร์)",
    admin_reset_btn: "รีเซ็ตเป็นข้อมูลวิจัย",
    admin_reset_title: "รีเซ็ตข้อมูลทั้งหมด?",
    admin_reset_body: "ระบบจะลบแนวทางทั้งหมด แล้วโหลดข้อมูลวิจัย 32 แนวทางใหม่ สิ่งที่แก้ไขไว้จะหายทั้งหมด",
    admin_reset_confirm: "รีเซ็ต",
    admin_nav_scenarios: "แนวทาง",
    admin_nav_app: "ดูแอปเกษตรกร",
    toast_reset: "รีเซ็ตข้อมูลเรียบร้อยแล้ว",
    toast_duplicate: "มีแนวทางที่ใช้เงื่อนไขนี้อยู่แล้ว",
    toast_need_yield: "กรุณากรอกผลผลิตหัวสด",
    modal_section_text: "ข้อความที่แสดงให้เกษตรกร",
    modal_dry_label: "น้ำหนักแห้งจาก DSSAT (กก./เฮกตาร์)",
    modal_dmc_label: "% น้ำหนักแห้ง (DMC)",
    modal_sd_label: "± ความต่างแต่ละปี (ตัน/ไร่)",
    modal_calc_hint: "กรอกน้ำหนักแห้งและ % น้ำหนักแห้ง ระบบจะคำนวณผลผลิตหัวสดให้อัตโนมัติ (ถ้าไม่กรอกชื่อ ระบบจะตั้งชื่อให้)",
    f_name: "ชื่อแนวทาง",
    f_desc: "คำอธิบาย",
    f_freq: "การให้น้ำ",
    f_n: "ปุ๋ยไนโตรเจน",
    f_sched: "ตารางการดูแล",
    f_source: "แหล่งอ้างอิง",
  },
  en: {
    variety_KU50: "Kasetsart 50",
    variety_RY9: "Rayong 9",
    variety_RY11: "Rayong 11",
    variety_CMR38: "CMR38-125-77",
    unit_ton: "tons",
    chip_n_applied: "Nitrogen applied",
    chip_n_none: "No nitrogen",
    result_for_field: "Field",
    result_normal_year: "normal year",
    result_fresh_note: "Fresh root weight",
    result_level_title: "Yield level",
    level_low: "Low",
    level_mid: "Medium",
    level_high: "High",
    level_vs_above: "Higher than the average farmer (3 t/rai) by about",
    level_vs_times: "times",
    level_vs_same: "About the same as the average farmer (3 t/rai)",
    level_vs_below: "Lower than the average farmer (3 t/rai)",
    result_tip_title: "How to get more",
    tip_if: "If you",
    tip_and: "and",
    tip_add_n: "add nitrogen fertilizer",
    tip_no_n: "skip nitrogen fertilizer",
    tip_add_water: "irrigate fully",
    tip_rainfed: "rely on rainfall",
    tip_already_best: "Your plan already gives the highest yield when changing one thing at a time",
    tip_see_compare: "See all comparisons",
    result_source_title: "Where does this number come from?",
    result_source_model: "Calculated with the DSSAT cassava crop model, tested against KKU field trials",
    result_source_site: "Uses sandy soil and 29 years of real weather for the production area (Khon Kaen data)",
    result_source_fresh: "Converted from dry to fresh weight using this variety's dry matter %",
    result_source_potential: "This is the yield with good care; real yields may be lower due to pests, disease or weeds",
    compare_need_input: "Fill in your field information first, then we can compare what happens if you change your method",
    compare_yours_label: "Your current plan",
    compare_if_add_n: "With nitrogen fertilizer",
    compare_if_no_n: "Without nitrogen fertilizer",
    compare_if_add_water: "With adequate irrigation",
    compare_if_no_water: "Rainfed only",
    compare_if_late: "Late rainy planting",
    compare_if_early: "Early rainy planting",
    compare_metric_per_rai: "Per rai",
    compare_metric_field: "Total field",
    compare_col_diff: "Difference from baseline",
    cmp_base_title: "Your current plan (comparison baseline)",
    cmp_filter_title: "Compare when changing:",
    cmp_filter_nitrogen: "Fertilizer",
    cmp_filter_water: "Water",
    cmp_filter_planting: "Planting date",
    cmp_show_as: "Display yield:",
    cmp_col_yield: "Yield",
    cmp_best_badge: "Most gain",
    cmp_baseline: "Baseline",
    cmp_pick_filter: "Pick at least one filter above to see a comparison",
    feat_1_title: "DSSAT Engine",
    feat_1_desc: "Crop model calibrated with KKU field trials",
    feat_2_title: "Instant Yield Forecast",
    feat_2_desc: "Compare rainfed vs. irrigated",
    feat_3_title: "Nitrogen & Water Impact",
    feat_3_desc: "See how much each change adds",
    form_area_suffix: "RAI",
    rec_title: "Actionable Recommendations",
    badge_natural: "Natural",
    badge_managed: "Managed",
    badge_important: "Important",
    badge_not_applied: "Not applied",
    badge_selected: "Selected",
    cmp_sim_pill: "DSSAT crop simulation · 29-year average",
    cmp_base_pill: "Base scenario",
    brand: "Na-Dee",
    role_farmer: "Farmer",
    admin_btn: "Admin",
    home_eyebrow: "Smart Crop Simulation & Yield Advisory",
    home_title: "Choose a water management approach for your cassava field",
    home_desc: "Select your variety, cultivated area, planting date, irrigation method, and nitrogen fertilizer. The system instantly predicts the yield for your whole field.",
    home_cta: "Start entering your data",
    stat_scenarios: "Scenarios",
    stat_provinces: "Varieties",
    stat_areas: "Provinces",
    home_section_title: "4 main management approaches",
    scenario_1_name: "Smallholder farmer",
    scenario_1_sub: "Low cost · rain-fed",
    scenario_1_badge: "Medium-low yield",
    scenario_2_name: "Boost yield with guidance",
    scenario_2_sub: "Efficient water use",
    scenario_2_badge: "Medium-high yield",
    scenario_3_name: "Maximize yield",
    scenario_3_sub: "Full management",
    scenario_3_badge: "High yield",
    scenario_4_name: "Climate resilience prep",
    scenario_4_sub: "Drought-tolerant · climate resilient",
    scenario_4_badge: "Future-proof",
    nav_home: "Home",
    nav_input: "Input form",
    nav_compare: "Compare",
    nav_admin: "Result",
    form_title: "Your field information",
    form_province: "Province",
    form_area_fixed: "Cassava production area (Khon Kaen)",
    form_nitrogen: "Nitrogen fertilizer",
    form_nitrogen_applied: "Applied",
    form_nitrogen_not_applied: "Not applied",
    form_province_kk: "Khon Kaen",
    form_province_ud: "Udon Thani",
    form_variety: "Cassava variety",
    form_variety_placeholder: "Select a variety",
    form_planting_date: "Planting date",
    form_planting_early: "Early rainy season (May-Jun)",
    form_planting_late: "Late rainy season (Oct-Nov)",
    form_irrigation: "Irrigation",
    form_irrigation_rain: "Rain-fed (no extra water)",
    form_irrigation_system: "Follow system recommendation",
    form_area: "Cultivated area (rai)",
    form_area_placeholder: "e.g. 8",
    form_next: "Next",
    form_error_required: "This field is required",
    form_error_number: "Please enter a number greater than 0",
    form_submitted_toast: "Your field data was saved",
    login_title: "Admin sign in",
    login_subtitle: "For data managers",
    login_email: "Email",
    login_password: "Password",
    login_button: "Sign in",
    login_error: "Incorrect email or password",
    login_back: "Back to home",
    admin_all_scenarios: "All scenarios",
    admin_add: "Add scenario",
    admin_summary_title: "System summary",
    admin_summary_scenario: "Scenarios",
    admin_summary_province: "Provinces",
    admin_summary_crop: "Varieties",
    admin_logout: "Log out",
    admin_empty: "No scenarios yet. Add a new one to get started.",
    modal_add_title: "Add new scenario",
    modal_edit_title: "Edit scenario",
    modal_name_label: "Scenario name",
    modal_name_placeholder: "e.g. Smallholder farmer — rain-fed",
    modal_water_label: "Water (m³/rai/week)",
    modal_water_placeholder: "e.g. 14",
    modal_frequency_label: "Irrigation frequency (Thai)",
    modal_frequency_placeholder: "e.g. 24 m³/rai every 12 days",
    modal_province_label: "Province",
    modal_cancel: "Cancel",
    modal_save: "Save",
    modal_delete_title: "Confirm delete scenario",
    modal_delete_body_prefix: "This cannot be undone. Delete \"",
    modal_delete_body_suffix: "\"?",
    modal_delete_confirm: "Delete scenario",
    toast_added: "Scenario added",
    toast_updated: "Changes saved",
    toast_deleted: "Scenario deleted",
    toast_error: "Something went wrong, please try again",
    modal_section_info: "General info",
    modal_section_match: "Matching conditions (4)",
    modal_section_output: "Yield",
    modal_name_en_label: "English name",
    modal_description_label: "Description (Thai)",
    modal_variety_label: "Varieties (comma-separated)",
    modal_yield_label: "Fresh yield (t/rai)",
    modal_wue_label: "WUE (kg/m³)",
    modal_n_label: "Nitrogen fertilizer (Thai)",
    modal_schedule_label: "Irrigation schedule (Thai)",
    modal_source_label: "Data source (English)",
    modal_section_lang: "English text (shown in EN mode)",
    modal_description_en_label: "Description (English)",
    modal_frequency_en_label: "Irrigation frequency (English)",
    modal_schedule_en_label: "Irrigation schedule (English)",
    modal_n_en_label: "Nitrogen fertilizer (English)",
    modal_source_th_label: "Data source (Thai)",
    modal_name_en_placeholder: "e.g. Smallholder — Rain-fed",
    modal_variety_placeholder: "Huay Bong 80, Rayong 11, ห้วยบง 80",
    modal_n_placeholder: "14.4 kg nitrogen/rai",
    admin_seed_btn: "Load research dataset (32 scenarios)",
    toast_seeded: "Scenario dataset loaded",
    irrigation_short_rain: "Rain-fed",
    irrigation_short_system: "Irrigated",
    unit_ton_rai: "t/rai",
    unit_rai: "rai",
    unit_m3_rai_week: "m³/rai/week",
    unit_kg_m3: "kg/m³",
    result_empty: "No result yet. Fill in your field information to get a recommendation.",
    result_eyebrow: "Predicted total yield",
    result_outputs_title: "Predicted results (per rai)",
    result_total_yield: "Yield (tons)",
    result_total_water: "Water (m³/week)",
    result_advice_title: "What to do",
    result_frequency: "Irrigation frequency",
    result_schedule: "Irrigation schedule",
    result_fertilizer: "Nitrogen fertilizer",
    result_variety: "Varieties in reference data",
    result_why_title: "Why this approach",
    result_other_title: "Other approaches in this province",
    result_source: "Data source",
    result_compare_btn: "Explore alternative scenarios",
    result_again_btn: "Edit field data",
    compare_title: "Scenario Comparison",
    compare_desc: "Starting from your plan, see how yield changes if you change one thing",
    compare_loading: "Loading...",
    compare_empty: "No data for this variety and planting date yet",
    compare_chart_title: "Comparison chart",
    compare_table_title: "Comparison table",
    compare_metric_yield: "Yield",
    compare_metric_water: "Water/week",
    compare_metric_wue: "WUE",
    compare_col_scenario: "Scenario",
    compare_your_match: "Current plan",
    weather_title: "Adjusted to the next 7 days of weather",
    weather_loading: "Loading weather forecast...",
    weather_error: "Can't load the weather forecast right now. Use the research-based water amount above.",
    weather_rain_caption: "Daily forecast rain (mm) and max temperature",
    weather_rain: "Rain (7 days)",
    weather_need: "Crop water need",
    weather_cover: "Rain covers",
    weather_advice_prefix: "This week, irrigate",
    weather_total: "whole field",
    weather_advice_skip: "Rain is enough — <b>you can skip irrigation this week</b>",
    weather_advice_rainfed: "This approach is rain-fed. Use the forecast to plan field work.",
    weather_saved: "Water saved:",
    weather_source: "Weather: Open-Meteo API · FAO-56 method (Kc = 0.8)",
    unit_mm: "mm",
    unit_m3: "m³",
    compare_note: "Fresh root yield, averaged over 29 years of real weather (DSSAT crop model)",
    admin_role: "Admin",
    admin_title: "Scenario Management",
    admin_subtitle: "DSSAT yield data that farmers see in the app",
    admin_summary_yield: "Yield range (t/rai)",
    admin_filter_all: "All",
    admin_col_scenario: "Conditions",
    admin_col_yield: "Fresh yield (t/rai)",
    admin_col_dry: "Dry weight (kg/ha)",
    admin_reset_btn: "Reset to research data",
    admin_reset_title: "Reset all data?",
    admin_reset_body: "This deletes every scenario and reloads the 32 research scenarios. Any edits will be lost.",
    admin_reset_confirm: "Reset",
    admin_nav_scenarios: "Scenarios",
    admin_nav_app: "Farmer app",
    toast_reset: "Data has been reset",
    toast_duplicate: "A scenario with these conditions already exists",
    toast_need_yield: "Please enter the fresh yield",
    modal_section_text: "Text shown to farmers",
    modal_dry_label: "DSSAT dry weight (kg/ha)",
    modal_dmc_label: "Dry matter content (%)",
    modal_sd_label: "± year-to-year (t/rai)",
    modal_calc_hint: "Enter dry weight and dry matter % and the fresh yield is calculated for you (the name is auto-filled if left empty)",
    f_name: "Scenario name",
    f_desc: "Description",
    f_freq: "Irrigation",
    f_n: "Nitrogen fertilizer",
    f_sched: "Care schedule",
    f_source: "Data source",
  },
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

/**
 * Pick the right language version of a scenario text field.
 * EN: uses key + "_en" when it exists; TH: uses key + "_th" when it exists.
 * Falls back to the plain field.
 */
function localized(obj, key) {
  if (!obj) return "";
  const alt = obj[key + (getLang() === "en" ? "_en" : "_th")];
  return alt !== undefined && alt !== null && String(alt).trim() !== "" ? alt : obj[key];
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
/* ---------------------------------------------------------
   Small line icons (Lucide-style, 24x24, stroke = currentColor)
   Usage in page scripts:  icon("droplet")
   --------------------------------------------------------- */
const ICON_PATHS = {
  sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  edit: '<path d="M21 6H3"/><path d="M10 12H3"/><path d="M10 18H3"/><path d="M15 18l6-6-3-3-6 6v3z"/>',
  flask: '<path d="M10 2v7.5L4.5 19A2 2 0 0 0 6.2 22h11.6a2 2 0 0 0 1.7-3L14 9.5V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
  sliders: '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  mapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

function icon(name, cls = "") {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}
