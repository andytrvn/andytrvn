// =============================================================
// Strava OAuth + API proxy — deploy this as a Cloudflare Worker.
//
// Why this exists: Strava's /oauth/token endpoint has no CORS
// headers, so a static site (GitHub Pages) can't exchange an
// authorization code for an access token directly from the browser.
// This tiny proxy holds the Strava app's client secret server-side
// and does that one exchange on the dashboard's behalf. It also
// proxies the activities list fetch for consistency (same-origin,
// no CORS surprises either way).
//
// It never sees or stores your Strava data — it's a stateless
// pass-through that adds the secret to the token requests and adds
// CORS headers to the responses.
//
// -------------------------------------------------------------
// DEPLOY (all in the Cloudflare dashboard, no CLI needed):
//   1. https://dash.cloudflare.com → sign up free if you haven't.
//   2. Workers & Pages → Create → Create Worker → name it
//      (e.g. "strava-proxy") → Deploy.
//   3. Click the worker → Edit code → replace the default script
//      with this whole file → Save and Deploy.
//   4. Settings → Variables and Secrets → add:
//        STRAVA_CLIENT_ID      = your Strava API app's Client ID
//        STRAVA_CLIENT_SECRET  = your Strava API app's Client Secret
//                                 (add this one as type "Secret")
//        ALLOWED_ORIGIN        = https://andytrvn.github.io
//      Save and redeploy.
//   5. Note the worker's URL, shown at the top of its page —
//      something like https://strava-proxy.<you>.workers.dev
//
// Get your Strava Client ID / Secret from https://www.strava.com/settings/api
// (Authorization Callback Domain: andytrvn.github.io)
// =============================================================

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    try {
      // ---- Token exchange / refresh ----
      if (url.pathname === '/oauth/token' && request.method === 'POST') {
        let body;
        try { body = await request.json(); } catch (e) { body = {}; }

        const form = new URLSearchParams();
        form.set('client_id', env.STRAVA_CLIENT_ID);
        form.set('client_secret', env.STRAVA_CLIENT_SECRET);
        if (body.grant_type === 'refresh_token') {
          form.set('grant_type', 'refresh_token');
          form.set('refresh_token', body.refresh_token || '');
        } else {
          form.set('grant_type', 'authorization_code');
          form.set('code', body.code || '');
        }

        const stravaRes = await fetch(STRAVA_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
        const data = await stravaRes.text();
        return new Response(data, {
          status: stravaRes.status,
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        });
      }

      // ---- Activities list (just forwards the Bearer token through) ----
      if (url.pathname === '/activities' && request.method === 'GET') {
        const auth = request.headers.get('Authorization');
        if (!auth) {
          return new Response(JSON.stringify({ error: 'missing Authorization header' }), { status: 401, headers });
        }
        const stravaRes = await fetch(STRAVA_API_BASE + '/athlete/activities' + url.search, {
          headers: { Authorization: auth },
        });
        const data = await stravaRes.text();
        return new Response(data, {
          status: stravaRes.status,
          headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
        });
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
    }
  },
};
