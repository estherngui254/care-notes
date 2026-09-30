# Vibe Coding SDLC Starter

A React + Vite app for the three-day workshop. It demonstrates one local record workflow: create, view, edit, delete, required-title validation, an empty state, and browser storage.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- VS Code and a modern browser

Vite requirements can change; check https://vite.dev/guide/ before a future workshop.

## Run locally

    npm install
    npm run dev

Open the local address shown in the terminal. Keep the terminal running.

Create and preview a production build:

    npm run build
    npm run preview

## Starter map

- src/App.jsx: form, list, create/edit/delete actions, and UI states
- src/storage.js: safe JSON read/write helpers for this browser
- src/styles.css: responsive baseline styles
- vite.config.js: Vite React plugin setup

## Workshop use

1. Run the app and inspect its behavior.
2. Map each behavior to an acceptance criterion.
3. Choose and plan your own project; adapt record fields and labels.
4. Make one focused AI-assisted change at a time.
5. Inspect the diff and test before committing.

This is a teaching scaffold, not a production backend. Browser storage is specific to this browser and site origin; it is not encrypted, shared, or suitable for secrets or sensitive information. Clearing site data deletes these records.
