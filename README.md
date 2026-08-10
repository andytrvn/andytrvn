# Personal Dashboard

A set of small, self-contained HTML apps that share a top bar.

## Live

Hosted on GitHub Pages: https://andytrvn.github.io/andytrvn/

## Cloud sync (use it from any device)

Click the ☁ icon in the top bar and sign in with Google. Once signed in,
the page's entire local state gets mirrored to a hidden file in your
Google Drive (`appDataFolder` — not visible in your normal Drive). Sign
in with the same Google account on your phone and your laptop and both
stay in sync automatically:

- Local edits push to Drive ~1.5s after you stop typing/changing something.
- Pulls (and a one-time reload if anything changed) happen when you open
  the page, sign in, or switch back to the tab/app.
- It's last-write-wins, not a live merge — if you edit the same thing on
  two devices within a couple seconds of each other, whichever saves last
  wins. Fine for a personal tracker, just worth knowing.
- The first sign-in on each device shows a "Google hasn't verified this
  app" screen — that's expected since this is a personal-use OAuth app,
  not a bug. Click **Advanced → Go to (unsafe)** to continue.
- Without signing in, everything works exactly as before: pure
  `localStorage`, no network calls, no account needed.

## Strava import (Run Coach / Ride Coach)

Both trackers can pull your activities in from Strava — including Zwift
rides, if your Zwift is set to auto-upload to Strava (Zwift Companion app
→ Connect to Strava). Connecting once in either page's Settings covers
both, since they share the same login.

This needs a small server-side piece because Strava's OAuth token
endpoint doesn't support CORS, so a browser can't do the token exchange
directly — see [strava-proxy-worker.js](strava-proxy-worker.js) for the
~5-minute setup (a free Cloudflare Worker). Until it's set up, the
Strava section in Settings just says so and the rest of the app works
exactly the same, local-only.

## MyFitnessPal import (Food Log)

MyFitnessPal closed their public API to new developers years ago, and
unofficial workarounds that scrape their site are unreliable enough
that they're not worth building on. So Food Log takes CSV instead of
live sync: in MyFitnessPal, go to **More → Settings → Export Data**,
request a nutrition export, and upload the CSV it emails you in Food
Log's Settings. Re-uploading later only adds entries it hasn't seen
before, so it's safe to do repeatedly as you export more history.

## Deploy your own copy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRowanThistlebrooke%2FYTdashh1)

One click → Vercel signs you in, copies the repo to your GitHub, and deploys it. ~30 seconds to a live URL.

## How to use

Open any `.html` file directly in your browser — no build step, no install.

| File | What it is |
|---|---|
| [index.html](index.html) | Goals tracker (Day Ring, Goal Ticker, To Do list) — the home page |
| [health.html](health.html) | Supplement / daily stack tracker |
| [po-water.html](po-water.html) | Water intake tracker |
| [finance.html](finance.html) | Finances |
| [gym.html](gym.html) | Progressive overload gym tracker |
| [running.html](running.html) | Run Coach — weekly mileage goal, pace, PRs, shoe mileage |
| [cycling.html](cycling.html) | Ride Coach — weekly mileage goal, avg speed, elevation, bike chain-wear tracking |
| [food.html](food.html) | Food Log — daily calorie/macro goal ring, streak, favorites quick-add, MyFitnessPal CSV import |
| [topbar.js](topbar.js) | Shared top bar — auto-injected into pages that `<script src="topbar.js">` |

Each app stores its own state in browser `localStorage`. No accounts, no server.

## Building from scratch

[BUILD_DASHBOARD.md](BUILD_DASHBOARD.md) is the prompt I gave Claude to generate `index.html` — paste it into Claude if you want to rebuild that page yourself.
