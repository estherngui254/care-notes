# Plant Care Notes acceptance checks

Most checks are covered by automated tests (`npm test`). The **Automated test** column names the test file that covers each one. Checks marked **manual** need a real browser. Run the manual ones with `npm run dev` and record the result. Start from a clean state: clear this site's localStorage, or delete all plants.

## Acceptance criteria

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 1 | Save a plant | Enter a plant name and care, then select **Save plant**. | The plant appears in the list with name and care visible. | App.test.jsx | |
| 2 | Required fields | Try to save with the name blank, then with no recommendation and no other care, then with only spaces. | Nothing is saved. A message names the missing field and focus moves to it. | App.test.jsx | |
| 3 | Edit a plant | Select **Edit**, change the name or care, then select **Save changes**. | The updated details appear in the list. | App.test.jsx | |
| 4 | Delete a plant | Delete a plant, then delete the last remaining one. | The plant disappears. Deleting the last one shows the empty state. | App.features.test.jsx (undo) | |
| 5 | Persistence | Add a plant, refresh the browser. Edit it, refresh again. | The saved details are still visible after each refresh. | App.test.jsx (remount) | **manual** |

## Other checks

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 6 | Empty state | Open the app with no saved plants, then select **Add your first plant**. | "No plants saved yet" shows and focus moves to the plant name field. | App.test.jsx | |
| 7 | Cancel edit | Select **Edit**, change a field, then select **Cancel**. | The form clears and the plant is unchanged. | App.test.jsx | |
| 8 | Narrow width | Resize the window to phone width. | Controls stay visible and Edit and Delete wrap below the plant details. | none | **manual** |
| 9 | Storage unavailable | Block site data for the page, then add a plant. | A warning says changes may not survive a refresh, and the app does not crash. | App.test.jsx | |
| 10 | Last watered | Add a plant with a last watered date. Future dates can't be picked. | The date and "Watered N days ago" show. | App.features.test.jsx | |
| 11 | Plant name list | Click **Plant name** and pick a listed plant, then type your own name. | Both save as the plant name. | none | **manual** |
| 12 | Care recommendations | Under **Care note**, select two or more recommendations and save. Press Escape and click outside to close the list. | They show as tags, are pre-selected when editing, and survive a refresh. | App.test.jsx | |
| 13 | Other care | Try recommendations only, other care only, then neither. | Either alone saves. With neither, nothing saves and a message appears. | App.test.jsx | |

## Added features

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 14 | Watering schedule | Set a last watered date and "Water every N days". Try 0 and 2.5. | Overdue, due-today and upcoming labels are correct. **Needs water** lists due plants. Invalid intervals are rejected. | plantUtils.test.js, App.features.test.jsx | |
| 15 | Search and filter | Search by name and by care text. Filter by a recommendation. Clear filters. | Only matching plants show, with "N of M". No matches shows a message and a clear button. | App.features.test.jsx | |
| 16 | Sort | Change **Sort by** through each option. | The list reorders. Plants without a date or schedule sort last for the watering options. | plantUtils.test.js | |
| 17 | Undo delete | Delete a plant, then select **Undo** within 8 seconds. | The plant returns to its place. | App.features.test.jsx | |
| 18 | Export and import | Export, delete all plants, then import the file. Import it again. Import a text file. | Plants return. A second import reports duplicates. A bad file shows an error. | App.features.test.jsx (import) | **manual** (download) |
| 19 | Photo | Add a JPEG or PNG photo, save, refresh. Try a text file. | The photo shows in the list and survives a refresh. A non-image is rejected. | App.features.test.jsx (rejection only) | **manual** (upload and compression) |
| 20 | Dark mode | Select **Dark mode**, refresh, then **Light mode**. | The theme switches and is remembered. | App.features.test.jsx | **manual** (appearance) |
| 21 | Print | Select **Print care sheet**. | The preview shows plants without forms, buttons or controls. | none | **manual** |
| 22 | Install and offline | Open the deployed site, install it, then go offline and reload. | The app installs and still opens. Saved plants show. | none | **manual** |

## Plant health: pests, diseases and nutrients

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 23 | Report a problem | Open **Plant health** on a plant, select **Report a problem**, choose two or more symptoms. | **Possible matches** lists likely pests, diseases or deficiencies, best match first. **Use this** fills in **Suspected problem**. | App.issues.test.jsx, pestsAndDiseases.test.js | |
| 24 | Save and manage | Save the problem. Mark it resolved, reopen it, then delete it. Edit the plant and refresh. | The problem shows with its management plan while open. The plan hides when resolved. Problems survive editing the plant and a refresh. An empty report is refused. | App.issues.test.jsx | |
| 27 | Nutrient detection | Under **What do you suspect?**, choose **Nutrient problem**, then pick symptoms such as yellowing between veins on new leaves. | The nutrient tip shows, only nutrient-related symptoms are offered, and a deficiency such as iron is suggested first. Choosing **Pest or disease** hides the nutrient symptoms. | App.nutrients.test.jsx | |
| 28 | Management plan | Save a problem with a suspected cause, then tick some **Do now** steps. Refresh. | The plan shows **Do now**, **Prevent a repeat**, **Check again** and **Get help if**. The count of completed steps updates and survives a refresh. | App.nutrients.test.jsx | |
| 25 | Problem photo | Add a JPEG or PNG of the affected plant or pest. Try a text file. | The photo shows beside the problem and survives a refresh. A non-image is rejected. | App.issues.test.jsx (rejection only) | **manual** (upload and compression) |
| 26 | Guide | Open entries in **Pest, disease and nutrient guide**. | Entries are grouped as pests, diseases, nutrient deficiencies and care problems. Each shows its signs and management plan. | App.nutrients.test.jsx | |

## Identify from a photo

The tests use a fake service, so checks 29 to 31 need a real API key. A free Google Gemini key from https://aistudio.google.com/apikey is enough. Remember that on the free tier Google may use the photos you send.

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 29 | Key setup | Open **Identify a plant from a photo**. Try saving an empty key, then paste a real Gemini key. Select **Remove key**, then try the Claude option. | Gemini is offered first, with the note about Google using free-tier photos. An empty key is refused. A saved key shows the photo buttons. **Remove key** brings back the key form. The key is not in an exported backup. | PlantScanner.test.jsx | **manual** (real key) |
| 30 | Identify a plant | Choose a clear photo of a houseplant (a second close-up of a leaf is a good test) and select **Identify and check health**. | After a short wait it shows the plant name, scientific name and confidence, care requirements, and a health check. A photo of something that is not a plant says it could not be identified. | PlantScanner.test.jsx (fake service) | **manual** (real service) |
| 31 | Find a problem | Photograph a plant with a visible problem such as mealybugs, spotted leaves or yellow leaves. | The health check lists the problem with the signs it can see and steps to try. Compare it with the guide. | none | **manual** |
| 32 | Save the result | Select **Save as a plant**. | The plant appears in the list with its photo, a **Care requirements** section and any problems under **Plant health**. | PlantScanner.test.jsx | |
| 33 | Phone camera | On a phone, select **Take photo**. | The camera opens, and the photo appears as a thumbnail ready to analyse. | none | **manual** |
| 34 | Errors | Use a wrong key. Turn on airplane mode and try again. Add a fourth photo. | Plain messages: key not accepted, you are offline, up to 3 photos. Nothing crashes. | PlantScanner.test.jsx, identify.test.js | |

## Plant shop

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 35 | Browse the shop | Open **Shop**. Search by name or size, then filter by category and clear. | Items are grouped into three collapsible category dropdowns (indoor plants, plant media, pots) that show item counts and open while a filter is active; every row shows its name and its price in KSh and dollars; the count updates; no matches shows a message and a clear button. | PlantShop.test.jsx | |
| 36 | Basket and order | Add two items, change a quantity with +, remove one, then select **Place order**. | The basket shows per-item and total prices in both currencies. Placing an order confirms the amount in KSh and dollars and empties the basket. | PlantShop.test.jsx | |
| 37 | Shop on a phone | Resize the window to phone width. | Each open category table becomes a stacked list — every item shows its name, category, details, both prices and its button — and stays readable. | none | **manual** |
| 38 | M-PESA payment | Add an item and check the basket, then place the order. | The intro and the basket show **M-PESA** with a Buy Goods till number; the confirmation repeats the till number to pay to and still offers cash on collection or delivery. | PlantShop.test.jsx | |

## Share with a QR code

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 39 | Scan the QR code | Open the **Share** section and point a phone camera at the code. Try it in light and dark mode. | The phone offers to open https://estherngui254.github.io/care-notes/ and the site loads. The code is dark on white in both themes. | QrShare.test.jsx (decodes the code back to the address) | **manual** (real phone) |
| 40 | Copy and download | Select **Copy link**, paste it somewhere, then select **Download QR code**. | The pasted text is the site address. A `plant-care-notes-qr.png` image is saved and scans the same way. | QrShare.test.jsx | **manual** (clipboard and download) |

## Register, sign in and saved plants (Supabase)

Run `supabase/schema.sql` in the Supabase SQL Editor first, or saving will not work. The automated tests use an in-memory fake, so the checks marked **manual** are the ones that need your real Supabase project.

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 41 | Sign in is required | Open the site as a new visitor, with nobody signed in. Try the menu, scrolling and the browser's back button. | Only the sign-in and register page is shown. No plants, forms, guide, shop, photo identification or Edit and Delete buttons appear, and there is no way to carry on as a guest. No plants are requested from the server. | App.accounts.test.jsx | |
| 42 | Register | Open the **Create account** tab. Submit it empty, then with a bad email, a short password and a password typed differently the second time. Then register for real. | Each problem has its own message and the app stays hidden. A correct form shows **Check your email**. An email with a confirmation link arrives, and **Send the email again** sends another. | App.accounts.test.jsx, auth.test.js | **manual** (real email) |
| 43 | Confirm and sign in | Open the link in the email, return to the app and sign in. Then try a wrong password and an email with no account. | The right password opens the app with a welcome message. Both wrong tries give the same message, so it does not reveal which emails have accounts. | App.accounts.test.jsx | **manual** (real email) |
| 44 | Plants are saved online | Add, edit and delete a plant. Open Supabase **Table Editor ? plants**. | The banner says **Saved to your account**. The row appears, changes and disappears to match, and its `user_id` is yours. | App.cloud.test.jsx | **manual** (real database) |
| 45 | Another device | Sign in with the same account on a phone or another browser. | The same plants appear. A change on one shows on the other after you switch back to its tab. | App.cloud.test.jsx | **manual** (two devices) |
| 46 | Privacy between accounts | Register a second account and look at the plants. In Supabase, check the **Authentication ? Policies** page for `plants`. | The second account sees none of the first account's plants. Row Level Security is on, with four policies. | App.cloud.test.jsx | **manual** (real database) |
| 47 | Forgot password | On the sign-in tab choose **Forgot your password?**, enter your email, open the emailed link and choose a new password. | An email arrives. The link opens **Choose a new password**. After saving, you are signed in and the new password works. | App.accounts.test.jsx | **manual** (real email) |
| 48 | Stay signed in | Sign in, close the browser fully, reopen the site. Then **Sign out** and reopen it. | After closing you are still signed in. After signing out you see the sign-in page and no plants. | App.accounts.test.jsx | **manual** (real browser close) |
| 49 | Works offline | Open the app, switch the device to airplane mode, change a plant, then go back online. | The app opens offline with your plants. The banner says you are offline, then **Saved to your account** once you reconnect or choose **Try again**. | App.cloud.test.jsx | **manual** (real offline) |
| 50 | Old plants from this browser | On a browser that held plants from before accounts were online, sign in. | A banner offers to add them. After **Add**, they are in the account and the old copies are gone. **Not now** keeps them. | App.cloud.test.jsx | **manual** (old data) |
| 51 | Delete account | Under Backup choose **Delete account** and confirm. | The account and its plants are removed. In Supabase, the user and its rows are gone. You are back on the sign-in page. | App.accounts.test.jsx | **manual** (real database) |
| 52 | Look and keyboard | Open the sign-in page in light and dark mode and on a phone. Use only the keyboard: Tab through the form and submit it with Enter. | The page is readable and fits the screen. Focus starts in the first field, every control can be reached with Tab, and Enter submits. | none | **manual** |
## Checkout and order tracking

Run `supabase/orders.sql` in the Supabase SQL Editor first. The automated tests use an in-memory fake, and `supabase/sql.test.js` runs the SQL on a small in-memory Postgres, so the checks marked **manual** are the ones that need your real project.

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 53 | Checkout form | Add two items, choose **Checkout**. Choose an area, then switch to collection. | The form is filled in with your name and email. The summary shows items, the area's delivery fee and the total in KSh and dollars. Collection shows no address fields and a free fee. | App.orders.test.jsx | |
| 54 | Checkout checks | Submit the form empty, then with a phone number like 12345, then with a short M-PESA code. | Each problem has its own message and nothing is sent. Phone numbers like 0712 345 678 and +254 712 345 678 are accepted. | App.orders.test.jsx, orderLogic.test.js | |
| 55 | Place an order | Complete a delivery order paying by M-PESA with a code. | A confirmation shows the tracking code, the address, the total and the M-PESA code. The basket empties. The order appears under **My orders** as **Order placed**. | App.orders.test.jsx | **manual** (real database) |
| 56 | Order in Supabase | Open Supabase **Table Editor ? orders**. | One row with your `tracking_code`, `status` placed, the items, the total including the fee, and your `user_id`. The `order_events` table has a "We received your order" entry. | sql.test.js | **manual** (real database) |
| 57 | Collection and cash | Place an order for collection, paying at the shop. | No address is asked or stored, no fee is added, and the tracker has four steps ending at Collected. | App.orders.test.jsx | |
| 58 | Tracking through delivery | In Supabase, update the order as in docs/order-management.md: confirmed, packed, then out for delivery with a rider and arrival time. Watch **My orders** without reloading. | Within about 30 seconds, or after **Check for updates**, each stage lights up with its time. Out for delivery shows a green card with the rider's name, a **Call** button and the estimated arrival, and a banner at the top of the app. | App.orders.test.jsx | **manual** (real database) |
| 59 | Delivered | Set the order to `delivered`. | All five steps are ticked, the banner and the green card disappear, and the page says all orders are complete. | App.orders.test.jsx | **manual** (real database) |
| 60 | Cancel | Place an order and choose **Cancel this order**. Then try cancelling one the shop has packed. | The first is cancelled and the history says so. A packed order has no Cancel button, or says it can no longer be cancelled. | App.orders.test.jsx, sql.test.js | **manual** (real database) |
| 61 | Privacy | Sign in as a second person. | You see none of the first person's orders. Directly editing an order from the browser is refused. | App.orders.test.jsx, sql.test.js | **manual** (two accounts) |
| 62 | Find by code and phone view | Type a tracking code in **Find an order**. View **My orders** on a phone. | Only that order shows. On a phone the tracker runs down the page and nothing scrolls sideways. | App.orders.test.jsx | **manual** (phone) |
| 63 | Orders not set up | Before running `orders.sql`, open **My orders** and try to place an order. | A message says orders are not set up and names `supabase/orders.sql`. Nothing breaks. | App.orders.test.jsx | |
## Contact, updates and feedback

| # | Check | Steps | Expected | Automated test | Result |
|---|-------|-------|----------|----------------|--------|
| 64 | Updates | Open **Contact** before and after posting an update in the Supabase dashboard (Table Editor → news). | Updates show newest first; with none it says so, and before `contact.sql` it names that file. | App.contact.test.jsx, sql.test.js | **manual** (real database) |
| 65 | Message to the shop | Send a message; then submit the form empty. | Empty shows the two problems and sends nothing; a good one confirms, clears, and the row appears in the dashboard under messages with the account's email. | App.contact.test.jsx | **manual** (real database) |
| 66 | Feedback | Send a review (a rating is asked for), a complaint and a compliment. | Only a review shows the rating; each confirms; all three appear in the dashboard under feedback. | App.contact.test.jsx, sql.test.js | **manual** (real database) |
| 67 | Privacy | Sign in as a second person, and try signed out. | No one else's messages or feedback can be read, and nothing at all can be read or written while signed out. The app cannot write the news. | sql.test.js | |
| 68 | Replies | With a message sent, add a reply in the dashboard (message_replies → Insert row, with the message's id), then open **Your messages** and press **Check for replies**. | The reply appears under the message in the app, and another person's messages and replies stay hidden. | App.contact.test.jsx, sql.test.js | **manual** (real database) |

## Main workflow run

Add a plant, see it in the list, edit it, refresh to confirm it was saved, then delete it. All steps should work using only the visible controls.
