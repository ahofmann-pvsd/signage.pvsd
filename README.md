# District Signage Router

A tiny web app that lets a fleet of ChromeOS signage devices, all in the
same Admin Console organizational unit (OU), each display a *different*
URL — without needing separate OUs or per-device Admin Console kiosk
settings.

## How it works, in one sentence

Every device runs this same page as its kiosk app; the page asks the
device for its own **Asset ID**, looks that ID up in `mapping.json`, and
redirects the screen to whatever URL is assigned to it.

```
                 ┌─────────────────────┐
Device boots ──▶ │  index.html (kiosk)  │
                 └──────────┬───────────┘
                             │ 1. read this device's Asset ID
                             ▼
                 ┌─────────────────────┐
                 │  mapping.json        │  asset ID → URL
                 └──────────┬───────────┘
                             │ 2. look up the match
                             ▼
                 ┌─────────────────────┐
                 │  redirect the screen │
                 └─────────────────────┘
```

## Files

| File | Purpose |
|---|---|
| `index.html` | The router itself — all the logic lives here |
| `mapping.json` | The only file you edit day-to-day: Asset ID → URL pairs |
| `manifest.json` | Makes the page installable as a kiosk web app (PWA) |
| `sw.js` | Service worker — caches the router + mapping so a short network blip doesn't blank a screen |

## Testing locally (no Chromebook needed)

You don't need real hardware to build and test the logic. Serve the
folder with any static file server, e.g.:

```bash
cd signage-router
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html?asset=cafeteria` in your
browser. The `?asset=` query parameter simulates a device's Asset ID —
that's how you test different "devices" from mapping.json without
touching Admin Console at all. Try a few:

- `?asset=cafeteria`
- `?asset=gym-north`
- `?asset=totally-made-up` → should fall through to `mapping.json`'s
  `default` entry
- no `?asset=` at all → should show the "no Asset ID found" error card

This is a good first milestone for students: get the redirect logic
fully working and tested locally before ever touching a real device.

## Deploying to real devices

1. **Host these files somewhere with HTTPS.** GitHub Pages, Firebase
   Hosting, or your district's own web server all work — it just needs
   to be a stable public URL. Note the origin, e.g.
   `https://signage.yourdistrict.org`.

2. **Assign Asset IDs to each device.**
   Admin Console → *Devices* → *Chrome* → *Devices* → click a device →
   *Device details* panel → set **Asset ID** to a short label matching
   a key in `mapping.json` (e.g. `cafeteria`). This is per-device, so
   it works fine even though every device is in the same OU.

3. **Allow the app to read device attributes.**
   Admin Console → *Devices* → *Chrome* → *Settings* → *Device
   settings* → find **DeviceAttributesAllowedForOrigins** → add your
   app's origin from step 1. Without this, the browser blocks the
   Asset ID lookup for privacy reasons and every device will show the
   "no Asset ID found" error.

4. **Set the app as the kiosk app for your signage OU.**
   Admin Console → *Devices* → *Chrome* → *Apps & extensions* →
   *Kiosk* → select your signage OU → **Add** → **Add by URL** → enter
   your hosted `index.html` URL → set it as the auto-launch app.

5. **Test on one device first.** Re-launch kiosk mode (or reboot) on a
   single test device and confirm it redirects correctly before
   rolling out to the rest of the fleet.

## Updating content later

To change what a screen shows, or add a new screen, just edit
`mapping.json` and redeploy that one file — no Admin Console changes,
no touching the device. This is the main day-to-day maintenance task.

## Ideas for extending this (good student project directions)

- **Time-based routing** — same Asset ID shows different URLs depending
  on time of day (e.g. lunch menu at 11am, class schedule otherwise).
- **A tiny admin page** — a simple form-backed page that edits
  `mapping.json` through a backend instead of hand-editing JSON.
- **Health check dashboard** — have each router `fetch()` a logging
  endpoint on load so you get a live list of which screens checked in
  recently (handy for catching a screen that's stuck or offline).
- **Rotating content** — instead of one URL, assign an array of URLs
  per Asset ID and cycle through them with `setInterval`.
- **Graceful offline mode** — if `mapping.json` can't be reached at
  all, show a locally-cached "last known good" screen instead of the
  error card.

## Known limitations to be upfront about

- `navigator.managed.getAnnotatedAssetId()` requires a reasonably
  recent Chrome milestone and only works when this page is actually
  running as a policy-installed kiosk app on a managed device — it
  will not return a value in a normal browser tab (which is why the
  `?asset=` override exists for local testing).
- If your Chrome fleet is on an older version where that API isn't
  available, the fallback is a companion browser extension using
  `chrome.enterprise.deviceAttributes` — a bit more setup, and worth
  discussing as a stretch goal if students want to go deeper on the
  Chrome extension APIs.
