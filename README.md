# Plant Care Notes

A small React + Vite app for keeping care notes for your houseplants. Everything is saved in your browser, so it works offline and needs no account.

**Live demo:** https://estherngui254.github.io/care-notes/

## Features

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
- src/storage.js: reading, writing, migrating and backing up saved data
- src/photo.js: photo validation and compression
- src/IssuePanel.jsx, src/ManagementPlan.jsx, src/PestGuide.jsx, src/pestsAndDiseases.js: problem reports, management plans, the guide, and the symptom matching data
- src/plantTypes.js, src/careRecommendations.js: the option lists
- public/: web app manifest, icons and the offline service worker
- docs/implementation-plan.md: the slice-by-slice build plan and scope changes
- WORKSHOP-CHECKS.md: acceptance checks, with the automated test that covers each

## Data and privacy

Plants are stored in this browser's localStorage. They are not encrypted, shared or synced, and clearing site data deletes them. Use **Export plants** to keep a backup. Do not enter sensitive personal information.

## Not included

Accounts and cross-device sync, automatic identification of plants, pests or diseases from a photo, and care advice from an outside plant database. Each would need a backend or a third-party service, such as an AI vision API with a key.

## License

MIT. See [LICENSE](LICENSE).
