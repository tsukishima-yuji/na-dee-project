/* =========================================================
   netlify/lib/blob-store.js
   Opens a Netlify Blobs store with STRONG consistency.

   Why: by default Blobs is "eventually consistent" on the live
   site — after a delete/add/edit, the next read can still return
   the OLD data for up to ~60 seconds (it looks like "delete doesn't
   work" or "the new scenario didn't save"). `netlify dev` on your
   own computer is always up to date, which is why it only breaks
   on Netlify.

   If strong consistency isn't available in the environment, every
   call falls back to the normal (eventual) store, so nothing breaks.
   ========================================================= */

const { getStore, connectLambda } = require("@netlify/blobs");

function openStore(name, event) {
  if (event) connectLambda(event);

  const base = {
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_AUTH_TOKEN,
  };
  const strong = getStore(name, { ...base, consistency: "strong" });
  const eventual = getStore(name, base);

  const withFallback = (method) => async (...args) => {
    try {
      return await strong[method](...args);
    } catch (err) {
      if (/consisten|uncachedEdgeURL/i.test(String(err && err.message))) {
        return eventual[method](...args);
      }
      throw err;
    }
  };

  return {
    list: withFallback("list"),
    get: withFallback("get"),
    setJSON: withFallback("setJSON"),
    delete: withFallback("delete"),
  };
}

module.exports = { openStore };
