/* =========================================================
   netlify/functions/planting-check.js
   GET /api/planting-check?lat=16.47&lon=102.81

   "Is now a good time to plant?" — our API calls the external
   Open-Meteo Forecast API (https://api.open-meteo.com/v1/forecast,
   free, no key) and turns raw weather into a planting decision.

   External call (input -> output)
     input : latitude, longitude, timezone,
             daily=precipitation_sum, past_days=7, forecast_days=14,
             hourly=soil_moisture_3_to_9cm
     output: daily rain (mm) for the last 7 + next 14 days,
             hourly soil moisture (m³/m³) near the surface

   Our response
     {
       location: { lat, lon, name },
       soil_moisture_now,        // m³/m³ (0-1), latest hourly value
       soil_status,              // "moist" | "fair" | "dry"
       rain_past_7d_mm,
       rain_next_14d_mm,
       daily: [{ date, rain_mm, forecast: true|false }],
       verdict,                  // "good" | "watch" | "irrigate"
       source, fetched_at
     }
   Defaults to the Khon Kaen University farm (same site as the DSSAT data).
   ========================================================= */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT = { lat: 16.47, lon: 102.81, name: "Khon Kaen (KKU farm)" };

// thresholds for planting cassava stakes
const SOIL_MOIST = 0.2;   // m³/m³ and above: moist enough to plant
const SOIL_DRY = 0.12;    // below this: dry
const RAIN_ENOUGH = 30;   // mm of rain expected in the next 14 days

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // others can call our API too
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

/** Pure logic, kept separate so it is easy to test */
function summarize(raw, todayISO) {
  const dates = raw.daily.time;
  const rain = raw.daily.precipitation_sum.map((v) => (v == null ? 0 : v));
  const daily = dates.map((date, i) => ({ date, rain_mm: round1(rain[i]), forecast: date >= todayISO }));

  const rain_past_7d_mm = round1(daily.filter((d) => !d.forecast).reduce((s, d) => s + d.rain_mm, 0));
  const rain_next_14d_mm = round1(daily.filter((d) => d.forecast).reduce((s, d) => s + d.rain_mm, 0));

  // latest soil moisture value that is not in the future
  const nowISO = new Date().toISOString().slice(0, 13);
  const hours = raw.hourly.time;
  const sm = raw.hourly.soil_moisture_3_to_9cm;
  let soil = null;
  for (let i = hours.length - 1; i >= 0; i--) {
    if (sm[i] != null && hours[i].slice(0, 13) <= nowISO) { soil = sm[i]; break; }
  }
  if (soil == null) soil = sm.find((v) => v != null) ?? 0;

  const soil_status = soil >= SOIL_MOIST ? "moist" : soil >= SOIL_DRY ? "fair" : "dry";
  let verdict = "watch";
  if (soil_status !== "dry" && rain_next_14d_mm >= RAIN_ENOUGH) verdict = "good";
  else if (soil_status !== "moist" && rain_next_14d_mm < RAIN_ENOUGH) verdict = "irrigate";

  return {
    soil_moisture_now: Math.round(soil * 1000) / 1000,
    soil_status,
    rain_past_7d_mm,
    rain_next_14d_mm,
    daily,
    verdict,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const q = event.queryStringParameters || {};
  const lat = q.lat === undefined ? DEFAULT.lat : Number(q.lat);
  const lon = q.lon === undefined ? DEFAULT.lon : Number(q.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return json(400, { error: "lat must be -90..90 and lon must be -180..180" });
  }

  const url =
    `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum&hourly=soil_moisture_3_to_9cm` +
    `&past_days=7&forecast_days=14&timezone=Asia%2FBangkok`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
    const raw = await res.json();
    if (!raw.daily || !raw.hourly) throw new Error("Unexpected Open-Meteo response");

    const todayISO = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // Asia/Bangkok date
    const result = summarize(raw, todayISO);
    return json(
      200,
      {
        location: { lat, lon, name: q.lat === undefined && q.lon === undefined ? DEFAULT.name : "Custom location" },
        ...result,
        source: "Open-Meteo Forecast API (api.open-meteo.com)",
        fetched_at: new Date().toISOString(),
      },
      { "Cache-Control": "public, max-age=1800" } // weather changes slowly: cache 30 min
    );
  } catch (err) {
    console.error("planting-check error:", err);
    return json(502, { error: "Could not reach the weather service, please try again later" });
  }
};

exports.summarize = summarize; // for tests
