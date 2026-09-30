# Plant Care Notes acceptance checks

Run these manually in the browser (`npm run dev`) and record each result. Start with a clean state: clear this site's localStorage, or delete all plants.

## Acceptance criteria

| # | Check | Steps | Expected | Result |
|---|-------|-------|----------|--------|
| 1 | Save a plant | Enter a plant name and care note, then select **Save plant**. | The plant appears in the list with both name and care note visible. | |
| 2 | Required fields | Try to save with the name blank, then with no recommendation and no other care, then with only spaces. | Nothing is saved. A message names the missing field and focus moves to it. | |
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

## Stretch check

| # | Check | Steps | Expected | Result |
|---|-------|-------|----------|--------|
| 10 | Last watered | Add a plant with a last watered date, then edit the date. Also add one with no date. Refresh. | The date shows under the care note, updates after editing, and survives a refresh. A plant without a date shows no watered line. Future dates can't be picked. | |
| 11 | Plant name list | Click the **Plant name** box and pick an indoor plant from the list. Then type a name that isn't in the list, and save each. | Both a listed plant and a typed name save as the plant name. Only one name is set per plant. | |
| 12 | Care note recommendations (multiple) | Under **Care note**, open the dropdown, select two or more recommendations, and save. Edit the plant and change the selection. Press Escape and click outside to close the list. Refresh. | The selections show as tags in the list, are pre-selected when editing, and survive a refresh. The list closes on Escape and on an outside click. **Clear selection** empties it. | |
| 13 | Other care | Leave the recommendations empty, type text in **Other care**, and save. Then try with both empty. | Typed care alone saves. Recommendations alone save. With both empty, nothing saves and a message asks for a care note. | |

## Main workflow run

Add a plant, see it in the list, edit it, refresh to confirm it was saved, then delete it. All steps should work using only the visible controls.
