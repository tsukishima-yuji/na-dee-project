/* =========================================================
   netlify/functions/login.js
   POST /api/login  { email, password }  ->  { success, ... }

   Real admin accounts, stored in Netlify Blobs (a small
   key-value store Netlify gives every site for free — no
   separate database to set up). Each admin is one blob:
     key   = lowercased email
     value = { email, passwordHash, createdAt }
   Passwords are hashed with bcrypt before they're ever stored.

   FIRST RUN: there are no admins yet, so the very first login
   attempt auto-creates one default admin account (see
   ensureDefaultAdmin below) using DEFAULT_ADMIN_EMAIL /
   DEFAULT_ADMIN_PASSWORD from your Netlify environment
   variables, or the fallback credentials if you haven't set
   those. Log in once with that account, then see the README
   for how to add more admins (there's no "sign up" screen —
   this app assumes admins are added by whoever runs the site).
   ========================================================= */

const { getStore, connectLambda } = require("@netlify/blobs");
const bcrypt = require("bcryptjs");

const ADMIN_STORE = "admins";
const FALLBACK_EMAIL = "nadee102026@gmail.com";
const FALLBACK_PASSWORD = "adminNaDee102026";

async function ensureDefaultAdmin(store) {
  const { blobs } = await store.list();
  if (blobs.length > 0) return; // already have at least one admin — don't touch anything

  const email = (process.env.DEFAULT_ADMIN_EMAIL || FALLBACK_EMAIL).trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || FALLBACK_PASSWORD;
  const passwordHash = bcrypt.hashSync(password, 10);

  await store.setJSON(email, { email, passwordHash, createdAt: new Date().toISOString() });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let email, password;
  try {
    ({ email, password } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Email and password are required" }),
    };
  }
    
  

  connectLambda(event);

  const store = getStore(ADMIN_STORE, {
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN,
  });

  try {
    await ensureDefaultAdmin(store);

    const normalizedEmail = String(email).trim().toLowerCase();
    const admin = await store.get(normalizedEmail, { type: "json" });

    if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, error: "Incorrect email or password" }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, email: admin.email }) };
  } catch (err) {
    console.error("login error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error, please try again" }) };
  }
};