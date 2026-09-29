/* =========================================================
   weather.js — EXTERNAL API: Open-Meteo (https://open-meteo.com)
   Free, no API key. Used by result.js to adjust this week's
   irrigation amount to the real weather forecast.

   Called API:
     GET https://api.open-meteo.com/v1/forecast
       ?latitude=16.4419&longitude=102.8360
       &daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max
       &timezone=Asia/Bangkok&forecast_days=7

   Input : province code ("khon_kaen" | "udon_thani")
   Output: { days: [{ date, rain_mm, et0_mm, temp_max }], total_rain_mm, total_et0_mm }

   How the forecast is used (FAO-56 / CROPWAT method):
     crop water need (ETc) = ET0 x Kc          (Kc of cassava ~0.8)
     effective rain        = rain x 0.8        (part of rain the soil keeps)
     rain covers           = effective rain / ETc
     water this week       = scenario water x (1 - rain covers)
   ========================================================= */

const WEATHER_API = "https://api.open-meteo.com/v1/forecast";

const PROVINCE_COORDS = {
  khon_kaen: { lat: 16.4419, lon: 102.836 },
  udon_thani: { lat: 17.4138, lon: 102.7872 },
};

const CASSAVA_KC = 0.8;
const EFFECTIVE_RAIN_RATIO = 0.8;

const weatherCache = {}; // one request per province per page load

/** Call Open-Meteo and return the next 7 days for a province. */
async function getWeeklyWeather(province) {
  if (weatherCache[province]) return weatherCache[province];

  const coords = PROVINCE_COORDS[province];
  if (!coords) throw new Error(`Unknown province: ${province}`);

  const params = new URLSearchParams({
    latitude: coords.lat,
    longitude: coords.lon,
    daily: "precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max",
    timezone: "Asia/Bangkok",
    forecast_days: "7",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); // don't hang the page
  let res;
  try {
    res = await fetch(`${WEATHER_API}?${params}`, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`Open-Meteo request failed (${res.status})`);

  const data = await res.json();
  const d = data.daily;
  if (!d || !Array.isArray(d.time)) throw new Error("Unexpected Open-Meteo response");

  const days = d.time.map((date, i) => ({
    date,
    rain_mm: Number(d.precipitation_sum[i]) || 0,
    et0_mm: Number(d.et0_fao_evapotranspiration[i]) || 0,
    temp_max: Number(d.temperature_2m_max[i]),
  }));

  const result = {
    days,
    total_rain_mm: sum(days.map((x) => x.rain_mm)),
    total_et0_mm: sum(days.map((x) => x.et0_mm)),
  };
  weatherCache[province] = result;
  return result;
}

/**
 * Adjust a scenario's weekly water to this week's forecast.
 * Returns the numbers the result page shows.
 */
function adjustWaterForWeather(scenario, weather, area) {
  const etc = weather.total_et0_mm * CASSAVA_KC;
  const effectiveRain = weather.total_rain_mm * EFFECTIVE_RAIN_RATIO;
  const rainCover = etc > 0 ? Math.min(effectiveRain / etc, 1) : 1;

  const basePerRai = Number(scenario.water_allocation_week) || 0;
  const adjustedPerRai = basePerRai * (1 - rainCover);

  return {
    crop_need_mm: round1(etc),
    effective_rain_mm: round1(effectiveRain),
    rain_cover_percent: Math.round(rainCover * 100),
    base_per_rai: basePerRai,
    adjusted_per_rai: round1(adjustedPerRai),
    adjusted_total: round1(adjustedPerRai * area),
    saved_total: round1((basePerRai - adjustedPerRai) * area),
    skip_irrigation: basePerRai > 0 && adjustedPerRai < 1,
  };
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}