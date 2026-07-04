# Aether — Memory Universe Platform

A platform where creators build procedurally generated interactive night-sky
universes, hide personal memories among the stars, and share one link with
one recipient. Built with React + Vite (frontend) and **Firebase**
(Authentication, Firestore database, Storage).

This is real, runnable source code. No `.env` file is needed — your Firebase
config is a public identifier (not a secret), so it's hardcoded directly in
`src/lib/firebaseClient.js`. Real protection comes from the security rules
files (`firestore.rules`, `storage.rules`), not from hiding that config.

---

## 1. Create your Firebase project (~2 minutes)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**. Name it anything (e.g. `aether-universe`).
2. In the left sidebar: **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** → start in **production mode** → choose a region.
4. **Build → Storage → Get started** → production mode.
5. Click the gear icon (top left) → **Project settings** → scroll to "Your apps" → click the **</> Web** icon → register an app (any nickname) → you'll be shown a `firebaseConfig` object. Copy it.

## 2. Paste your config into the code

Open `src/lib/firebaseClient.js` and replace the six placeholder strings
with the real values from the `firebaseConfig` object you just copied:

```js
const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
};
```

That's it — no `.env` file, no build-time secrets.

## 3. Apply the security rules

In the Firebase Console:

- **Firestore Database → Rules** tab → replace the contents with everything
  in `firestore.rules` from this project → **Publish**.
- **Storage → Rules** tab → replace the contents with everything in
  `storage.rules` from this project → **Publish**.

These rules make sure: creators can only edit their own universes, private
`notes` and drafts stay private, and a recipient can open a shared link with
no login **only** once you've published that universe.

## 4. Run it locally to test

```bash
npm install
npm run dev
```

Open the printed local URL, sign up, create a universe, and try the
telescope.

## 5. Build a static site

```bash
npm run build
```

This produces a `dist/` folder — plain HTML/CSS/JS, no server required.
That's the actual "webpage" you deploy.

**Before building**, open `vite.config.js` and set `base` to match your
GitHub repo name exactly, e.g. if your repo is
`github.com/yourname/aether-memory-universe`, keep:
```js
base: '/aether-memory-universe/',
```
(If you're deploying to a custom domain instead, set `base: '/'`.)

## 6. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Aether memory universe platform"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 7. Turn on GitHub Pages

Easiest method — GitHub Actions auto-builds and deploys `dist/` for you:

1. In your repo → **Settings → Pages** → under "Build and deployment", set
   **Source** to **GitHub Actions**.
2. Add this file at `.github/workflows/deploy.yml` (create the folders):

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. Commit and push that file. Go to the **Actions** tab in your repo to
   watch it build; once it finishes, your live URL appears under
   **Settings → Pages** — something like
   `https://yourname.github.io/aether-memory-universe/`.

Recipient links will look like:
`https://yourname.github.io/aether-memory-universe/#/u/ABC1234`

## 8. What's built vs. what's left to extend

**Built and working:** sign up / log in (Firebase Auth), creator dashboard,
universe creation wizard (name/from/to/theme/10–15 memory stars), procedural
seed-based Three.js telescope experience (drag navigation, nebulas,
planets, comets, shooting stars, memory star discovery with 8 distinct
behaviors, a 5-found progression wave, frosted-glass memory viewer),
publish/share-link flow, Firestore security rules so recipients never need
an account and creators only ever see their own data.

**Stubbed for you to extend next:**
- Photo/video/voice **file upload UI** in the wizard — the Storage bucket
  and rules are ready; wiring `uploadBytes()` calls into `CreateWizard.jsx`
  and saving the resulting download URL onto each memory star is the next
  step.
- **Regenerate universe layout** button on the dashboard (the data model
  supports changing `seed` on an existing universe; no UI yet).
- Final Surprise cinematic sequence, constellation endings
  (heart/initials/custom), and per-object opening animations (crystal,
  envelope, flower, etc.) — simplified here versus the full original vision.
- QR code generation, media library (rename/reuse/folders), account
  settings page, storage usage meter.
- Rate limiting on share-code lookups against brute-force guessing —
  Firestore rules stop reading *unpublished* universes, but there's no
  throttling yet on repeated guesses of published codes. A Cloud Function
  with App Check would be the next hardening step before heavy real-world
  traffic.

## Project structure

```
├── index.html
├── package.json
├── vite.config.js
├── firestore.rules
├── storage.rules
└── src/
    ├── main.jsx
    ├── App.jsx             -- routing + auth state
    ├── lib/
    │   ├── firebaseClient.js   -- paste your config here
    │   └── procedural.js       -- seeded RNG, themes, shared constants
    ├── styles/
    │   └── index.css           -- full design system
    └── components/
        ├── AuthScreen.jsx
        ├── Dashboard.jsx
        ├── CreateWizard.jsx
        ├── Telescope.jsx       -- the Three.js universe experience
        └── MemoryViewer.jsx
```
