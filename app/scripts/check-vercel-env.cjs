if (process.env.VERCEL) {
  const value = process.env.API_BASE_URL;
  let api;
  try { api = new URL(value); } catch { api = null; }
  if (!api || api.protocol !== 'https:' || api.pathname.replace(/\/$/, '') !== '/api' || api.search || api.hash) {
    console.error('Set API_BASE_URL in the Vercel project to the HTTPS Render API URL ending in /api.');
    process.exit(1);
  }
}
