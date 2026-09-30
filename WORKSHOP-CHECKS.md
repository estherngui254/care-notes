# Plant Care Notes acceptance checks

Run these manually in the browser (`npm run dev`) and record each result. Start with a clean state: clear this site's localStorage, or delete all plants.

## Acceptance criteria

| # | Check | Steps | Expected | Result |
|---|-------|-------|----------|--------|
| 1 | Save a plant | Enter a plant name and care note, then select **Save plant**. | The plant appears in the list with both name and care note visible. | |
| 2 | Required fields | Try to save with the name blank, then with the care note blank, then with only spaces. | Nothing is saved. A message names the missing field and focus moves to it. | |
| 3 | Edit a plant | Select **Edit** on a plant, change the name or care note, then select **Save changes**. | The updated details appear in the list. | |
| 4 | Delete a plant | Delete a plant, then delete the last remaining one. | The plant disappears. Deleting the last one shows the empty state. | |
| 5 | Persistence | Add a plant, refresh the browser. Edit it, refresh again. | The saved details are still visible after each refresh. | |

## Other checks

| # | Check | Steps | Expected | Result |
|---|-------|-------|----------|--------|
| 6 | Empty state | Open the app with no saved plants, then select **Add your first plant**. | The message "No plants saved yet. Add your first plant to keep its care notes in one place." shows, and focus moves to the plant name field. | |
| 7 | Cancel edit | Select **Edit**, change a field, then select **Cancel**. | The form clears and the plant is unchanged. | |
| 8 | Narrow width | Resize the window to phone width. | Controls stay visible and the Edit and Delete buttons wrap below the plant details. | |
| 9 | Storage unavailable | Block site data for the page, then add a plant. | A warning says changes may not survive a refresh, and the app does not crash. | |

## Main workflow run

Add a plant, see it in the list, edit it, refresh to confirm it was saved, then delete it. All steps should work using only the visible controls.
