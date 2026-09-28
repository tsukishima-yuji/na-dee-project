/* =========================================================
   api.js

   This REPLACES mock-api.js. It has the exact same function
   names (getScenarios, addScenario, updateScenario,
   deleteScenario, submitFarmerInput, adminLogin,
   isAdminLoggedIn, adminLogout) so nothing else in the app had
   to change — only what happens INSIDE these functions changed:
   instead of reading/writing localStorage, they now call the
   real Netlify Functions in /netlify/functions, which store
   data in one shared place every device can see.

   NOTE: fetch('/api/...') only works when the site is served by
   Netlify (either the live URL, or `netlify dev` locally) — it
   will NOT work if you just double-click index.html, because
   there's no server to answer that request. See the README for
   how to run it locally with `netlify dev`.
   ========================================================= */

const API_BASE = "/api";

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/** GET /api/scenarios */
async function getScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`);
  return handleResponse(res);
}

/** POST /api/scenarios */
async function addScenario(data) {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

/** PUT /api/scenarios/:id */
async function updateScenario(id, data) {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

/** DELETE /api/scenarios/:id */
async function deleteScenario(id) {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, { method: "DELETE" });
  return handleResponse(res);
}

/** POST /api/match — farmer input form submission */
async function submitFarmerInput(formData) {
  const res = await fetch(`${API_BASE}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return handleResponse(res);
}

/** POST /api/login
 *  NOTE: "being logged in" is correctly kept PER DEVICE — that's how
 *  every website works (logging into Gmail on phone doesn't log
 * in laptop in too). Only the actual scenario DATA needs to be
 *  shared; the login state is meant to stay local. */
async function adminLogin(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem("nadee_admin_session", JSON.stringify({ email, loggedInAt: Date.now() }));
  }
  return data;
}

function isAdminLoggedIn() {
  return !!localStorage.getItem("nadee_admin_session");
}

function adminLogout() {
  localStorage.removeItem("nadee_admin_session");
}