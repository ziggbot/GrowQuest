# design/web — local-only mockup runner

A tiny Vite wrapper around `design/mockup.jsx` so you can open the React UX prototype in any browser. **This is dev tooling, not the shipping app.** The iOS app at `ios/` is what reaches the App Store; this folder just lets a contributor without macOS interact with the source-of-truth design.

## Run it

### macOS / Linux / WSL
```bash
./scripts/run-mockup.sh
```

### Windows (PowerShell or cmd, no WSL needed)
```
cd design\web
npm install
npm run dev
```

Either way, open <http://localhost:5173>. The mockup runs in a 420 px wide "phone frame".

## Requirements

Node.js 18 or newer (`node --version`). On Windows, install from <https://nodejs.org/> or via `winget install OpenJS.NodeJS.LTS`. On Linux, use your distro's package manager or `nvm`.

## What's in here

| File              | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `package.json`    | Vite + React 18, scripts only.                                  |
| `vite.config.js`  | Tells Vite to compile `.jsx` and to allow imports from `../mockup.jsx`. |
| `index.html`      | Phone-shaped centered frame so the desktop preview feels handheld. |
| `src/main.jsx`    | Mounts the default export of `../../mockup.jsx`.                |

`node_modules/` and `dist/` are gitignored at the repo root.

## Why not ship this?

The React mockup is the **interaction spec**. It's intentionally not architected for production: no auth, no data layer, hard-coded state, mixed Swedish identifiers. Shipping it would mean re-doing all the security & data work the iOS app already has. See [`docs/decisions/0001-ios-supabase-mvp.md`](../../docs/decisions/0001-ios-supabase-mvp.md).
