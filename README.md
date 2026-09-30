# Plant Care Notes

A small React + Vite app for keeping a short care note for each houseplant. Add a plant with a name and care note, view the list, edit a plant, and delete it. Plants are saved in this browser with localStorage, so they remain after a refresh.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser

## Run locally

    npm install
    npm run dev

Open the local address shown in the terminal. Keep the terminal running.

Create and preview a production build:

    npm run build
    npm run preview

## Project map

- src/App.jsx: form, plant list, add/edit/delete actions, validation and empty state
- src/storage.js: safe JSON read/write helpers for this browser
- src/styles.css: responsive styles
- docs/implementation-plan.md: the slice-by-slice build plan
- WORKSHOP-CHECKS.md: manual acceptance checks

## Scope

This is a small MVP. It has no accounts, sync, reminders, plant identification, photos or backend. Browser storage is specific to this browser and site origin. It is not encrypted or shared, and it is not suitable for sensitive information. Clearing site data deletes the saved plants.
