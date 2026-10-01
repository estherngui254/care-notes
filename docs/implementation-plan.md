# Plant Care Notes: implementation plan

**Starting point.** The starter already has a working add, edit, delete and localStorage loop. It uses generic `title` and `details` fields, and only the title is required. The work is to adapt it to the brief, not to build from scratch. Each slice below can be built, checked in the browser and committed on its own.

## Slice 0: Install and baseline (setup)
- Run `npm install` and `npm run dev`. Confirm the starter works before changing anything.
- **Done when:** the starter's 8 checks in [WORKSHOP-CHECKS.md](../WORKSHOP-CHECKS.md) pass.

## Slice 1: Rename the data to a plant (Must)
- In [App.jsx](../src/App.jsx), rename the fields: `title` becomes `name` and `details` becomes `careNote`.
- Change the storage key in [storage.js](../src/storage.js) to `plant-care-notes-plants`. This avoids picking up old starter records.
- Rename the app title, form labels and hints to plant wording. Keep the "no sensitive info" hint.
- **Done when:** a plant with a name and care note can be added, and the list shows both.
- **Covers:** acceptance criterion 1 (partly).

## Slice 2: Require both fields (Must)
- Make the care note required, not optional.
- Show a separate error for each blank field, for example "Enter a plant name" and "Enter a care note". Whitespace-only counts as blank.
- Set `aria-invalid` and `aria-describedby` on both inputs, and move focus to the first invalid field.
- Clear each error as soon as its field is valid.
- **Done when:** a blank name or a blank care note shows a message that names the field, and nothing is saved.
- **Covers:** acceptance criterion 2.

## Slice 3: Empty state and list readability (Must, then Could)
- Change the empty-state text to: "No plants saved yet. Add your first plant to keep its care notes in one place."
- Add an **Add your first plant** button that scrolls to the form and focuses the name field.
- Show the plant name as a heading and the care note beneath it, so each entry is easy to scan.
- **Done when:** with no plants the message and button appear, and the button focuses the form.
- **Covers:** the Must item "list and empty state" and the Could item "readability".

## Slice 4: Edit and delete with plant wording (Must)
- Edit and Delete already work. Relabel the buttons and headings ("Edit plant", "Save changes").
- Add a Cancel button while editing, and apply the same validation as adding.
- Delete the last plant and confirm the empty state returns. A confirm prompt before deleting is optional, and the brief doesn't require one.
- **Done when:** an edit updates the list, and deleting the last plant shows the empty state.
- **Covers:** acceptance criteria 3 and 4.

## Slice 5: Persistence check (Must)
- Confirm add and edit both survive a refresh. The starter already writes to storage in a `useEffect`.
- Keep the warning shown when storage is unavailable.
- **Done when:** refreshing after an add or an edit keeps the data.
- **Covers:** acceptance criterion 5.

## Slice 6: Verify the main workflow (Should)
- Replace the checks in [WORKSHOP-CHECKS.md](../WORKSHOP-CHECKS.md) with the five acceptance criteria.
- Add a step-by-step run: add, view, edit, refresh, delete. Add a narrow-width layout check.
- Update the [README.md](../README.md) to describe Plant Care Notes.
- **Done when:** every check has been run by hand and recorded as pass or fail.

## Slice 7 (stretch): Last watered date
- Add an optional `lastWatered` date field to the form and the list, and include it when editing.
- Handle old records without the field.
- Only start this once slices 1–6 are done.

## Order and commits
Do the slices in order, 0 to 6, with one commit per slice. The main dependency is that slice 1 (renamed fields) comes before everything else. Slices 2 to 5 can be reordered if you want. Push to the GitHub repo after each slice or after slice 6.

## Scope changes after the original plan

The slices above were built as planned. These additions came afterwards and go beyond the brief:

- Plant name is a searchable list of indoor plants plus free text (there is no separate plant type field).
- The care note is built from a multi-select list of care recommendations plus an "Other care" text box. Either one alone satisfies the "care note required" rule, so acceptance criterion 2 now means "no recommendation and no other care".
- Watering schedule ("water every N days") with days since watered, next due date and a "Needs water" list. The brief listed reminders and care schedules as non-goals. The app only shows status and sends no notifications.
- Photos, saved compressed in browser storage. The brief listed photos as a non-goal.
- Search, filter, sort, undo delete, JSON export and import, dark mode, print view.
- A plant health section on each plant covering pests, diseases and nutrient deficiencies: a photo of the affected plant or pest, symptoms, a suspected problem, an open or resolved state, and a management plan (do now steps with a checklist, prevention, when to check again, when to get help), plus a grouped guide. Matching is by chosen symptoms. The photo is not analysed, because automatic image identification would need an external AI service and key.
- Installable offline app (PWA), automated tests (Vitest), and deployment to GitHub Pages.

- Photo identification (plant type, care requirements and a health check for pests, diseases and nutrient deficiencies) using a vision AI service called from the browser. The user chooses Google Gemini (free tier, the default) or Claude (paid). It needs the user's own API key, kept in localStorage, and works only online. On the Gemini free tier Google may use the photos, which the app and README say. This is the one feature that sends data off the device, so the README documents the privacy and cost. A shared backend would let people use it without a key but needs a server, which the app does not have.

Still out of scope because they need a backend or an account: accounts and sync, and a hosted service for photo identification.

## Not in scope (from the brief)
Accounts or sync, reminders or care schedules, plant identification or external advice, photos, maps or social features, and any backend.
