# Plant Care Notes

A small React + Vite app for keeping care notes for your houseplants. Everything is saved in your browser, so it works offline and needs no account.

**Live demo:** https://estherngui254.github.io/care-notes/

## Features

- Identify a plant from a photo: take or choose up to 3 photos and the app tells you the plant type, its care requirements (light, water, humidity, temperature, soil, fertiliser, pet safety) and checks it for pests, diseases and nutrient deficiencies. You can save the result as a plant, with its problems recorded and its care requirements on its card. This uses an AI service and needs your own API key. A free Google Gemini key works (see below).
- Add, edit and delete plants. Pick a plant name from a list of common indoor plants or type your own.
- Care note built from a multi-select list of care recommendations, plus free text for other care.
- Optional last watered date and a "water every N days" schedule. The app shows days since watering, when the next watering is due, and lists plants that need water.
- Optional photo, shrunk before saving.
- Plant health: on each plant, report a pest, disease or nutrient problem with a photo of the affected plant or pest, the symptoms you see and a date. Say whether you suspect a pest or disease, a nutrient problem, or are not sure, and the app ranks likely causes from the symptoms. It covers 7 pests, 5 diseases and 6 nutrient deficiencies (nitrogen, phosphorus, potassium, magnesium, iron and calcium), plus fertiliser build-up and dry air. It does not analyse photos, so the photo is for your own comparison and records.
- Management plans: each problem has steps to do now (a checklist you can tick off), how to prevent a repeat, when to check again and when to get help. You can mark a problem resolved or reopen it. A built-in guide lists every pest, disease and deficiency with its signs and plan.
- Search, filter by recommendation, and sort (newest, name, longest since watered, next watering due).
- Undo after deleting a plant.
- Export and import a JSON backup.
- Light and dark mode, and a print view for a care sheet.
- Installable as an app and works offline (PWA).
- Sign in first: the app opens on a sign-in and register page, and nothing else is shown or editable until you are signed in. Accounts keep each person's plants separate on a shared device. See "Accounts" below for what they do and do not do.
- A scannable QR code (in the **Share** section) that opens the live site, with a copy-link button and a download of the code as an image. The code always points to the published address in `src/site.js`, even when the app is open on another address, and is always dark on white so every phone can scan it.

## Identify from a photo: setup, cost and privacy

Photo identification is the only feature that needs the internet and an API key. Everything else works offline with no account. You can choose between two services.

**Google Gemini (free tier), the default**
1. Go to [Google AI Studio](https://aistudio.google.com/apikey), sign in with a Google account and choose **Create API key**. No payment details are needed.
2. Paste the key into **Identify a plant from a photo** the first time you use it.
3. Take or choose photos, then select **Identify and check health**.

The free tier has per-minute and daily limits, and is not available in every country. **On the free tier, Google may use your photos and the answers to improve its products**, so do not use photos you want to keep private. A paid Google key does not do this.

**Claude (paid)**
Create a key in the [Anthropic Console](https://console.anthropic.com/) and set a low spend limit on it. Each scan costs a few cents. To make it cheaper, change `MODEL` in `src/identify.js` to `claude-sonnet-5-5`. This may identify plants a little less reliably.

**For both**
- **Where the key lives:** only in this browser's localStorage, one per service. The app has no server, so photos and the key go straight from your browser to the service. The key is never included in an export. Anyone who can use this browser could use the key, so avoid shared computers. Use **Remove key** to forget it.
- **What is sent:** your photos, only when you select Identify. They are resized to 1024 pixels first.
- **Accuracy:** results are an AI estimate from photos and can be wrong. The app shows its confidence and suggests photos that would help.
- **Model names:** the Gemini model is set by `GEMINI_MODEL` in `src/identify.js`. If Google retires it, the app says the model is not available, and you can change that line.

## Accounts

Everyone has to sign in first. When the app opens, the only thing shown is a page to **sign in** or **create an account** (a name, an email address and a password of at least 8 characters). The plants, shop, guide, photo identification and every editing control are not shown at all until you are signed in. There is no guest mode.

**These accounts live in this browser only.** The app has no server, so:
- Each account gets its own plants, separate from other accounts on the same browser. If plants were saved here before accounts existed, you can add them to your account when you register.
- The password is never stored. Only a salted hash of it is (PBKDF2 with SHA-256).
- Five wrong passwords in a row pause sign-in for 30 seconds.
- Accounts and plants **do not sync between devices**. Use **Export plants** to move them.
- There is **no password reset by email**. Someone who forgot their password can remove the account from the sign-in screen and register again, which deletes the plants in it. Export a backup now and then.
- **The sign-in page is a gate in the app, not a lock on the data.** It stops anyone using the app without signing in and keeps honest people's plants apart. But the data is in this browser's storage and the app's code is public, so anyone who can open developer tools or the browser's files can read or change it. Do not reuse a password from another site, and do not store anything sensitive.
- **Keep me signed in on this device** keeps you signed in after closing the browser. Turn it off on a shared computer.

Real accounts that sync across devices would need a server or a service such as Supabase or Firebase. The code in `src/accounts.js` is the only place that would need to change.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser

## Run locally

    npm install
    npm run dev

Open the local address shown in the terminal. Keep the terminal running.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm test` | Run the automated tests once |
| `npm run test:watch` | Run the tests as you edit |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run deploy` | Build and publish `dist/` to the `gh-pages` branch (GitHub Pages) |

## Project map

- src/App.jsx: page layout, state, delete/undo, backup and theme
- src/PlantForm.jsx: add and edit form, validation, photo upload
- src/PlantCard.jsx, src/PlantControls.jsx: list item and search/filter/sort controls
- src/MultiSelect.jsx: the checkbox dropdown used for care recommendations
- src/plantUtils.js: watering status, sorting and filtering
- src/accounts.js, src/AuthScreen.jsx: registering, signing in and out, password hashing, sessions and the sign-in page
- src/storage.js: reading, writing, migrating and backing up saved data
- src/photo.js: photo validation and compression
- src/PlantScanner.jsx, src/identify.js, src/scanToPlant.js: the photo identification screen, the Claude API request and result handling, and turning a result into a saved plant
- src/IssuePanel.jsx, src/ManagementPlan.jsx, src/PestGuide.jsx, src/pestsAndDiseases.js: problem reports, management plans, the guide, and the symptom matching data
- src/PlantShop.jsx, src/shopItems.js: the plant shop, its catalogue, KSh/USD prices and the M-PESA payment till
- src/plantTypes.js, src/careRecommendations.js: the option lists
- public/: web app manifest, icons and the offline service worker
- docs/implementation-plan.md: the slice-by-slice build plan and scope changes
- WORKSHOP-CHECKS.md: acceptance checks, with the automated test that covers each

## Data and privacy

Plants are stored in this browser's localStorage, apart from photos you send for identification (see above). They are not encrypted, shared or synced, and clearing site data deletes them. Use **Export plants** to keep a backup. Do not enter sensitive personal information.

## Not included

Accounts that sync across devices, password reset by email, and a shared backend that would let people use photo identification without their own API key. Each would need a server.

## License

MIT. See [LICENSE](LICENSE).
