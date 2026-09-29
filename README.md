# Na-Dee — Water Management Advisor

A cassava irrigation/yield scenario advisor: farmers enter their field
info and get matched to a recommended water-management scenario;
admins manage the scenario data.

## Running locally

This project needs to be served by Netlify (not opened as a plain
`file://` HTML file), because the client calls `/api/...` endpoints
that are backed by Netlify Functions.

```bash
npm install
npx netlify dev
```

Then open the URL it prints (usually `http://localhost:8888`).

## Admin login

Admin accounts are stored in **Netlify Blobs** (a small built-in
key-value store — no separate database to set up) and passwords are
hashed with bcrypt before they're stored.

There's no sign-up screen yet, so the **first time** `/api/login` runs,
it automatically creates one default admin account (the
project's test admin account):

- email: `nadee102026@gmail.com`
- password: `adminNaDee102026`

## Project structure

- `client/` — static frontend (HTML/CSS/JS), served as the site root
- `netlify/functions/` — serverless backend endpoints:
  - `login.js` — admin login (implemented)
  - `scenarios.js` — scenario (implemented, but need to fill)
  - `match.js` — farmer input matching (not implemented yet)
