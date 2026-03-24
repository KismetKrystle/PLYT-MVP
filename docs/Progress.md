# March 25, 2026

This note captures the work completed today across chat behavior, landing-page search intent, and the Store page/admin-request flow.

## 1. Chat behavior was refined to feel less repetitive and more useful

### Reduced repeated health-condition callouts
- Navi was still over-explaining recommendations through the user's health profile, even after earlier fixes.
- The recommendation prompts were updated so the AI now uses the health profile quietly in the background instead of repeatedly restating health conditions.
- The AI should now only mention health conditions when:
  - it is necessary to avoid a clear conflict
  - it materially changes the recommendation
  - the user explicitly asks why

### Improved grocery and ingredient intent handling
- Ingredient and fresh-food searches were still allowing restaurant-style results to rise too high.
- Place-ranking logic was tightened so produce-style searches now favor:
  - farm stands
  - farms
  - groceries
  - natural food stores
  - distributor-backed produce sources
- Restaurant and cafe results are now pushed down for clearly grocery-oriented searches.
- A produce-first filter was added so if enough relevant market-style results are found, they are preferred over restaurant-style results.

### Result
- Requests for ingredients, groceries, or market produce should now feel more aligned with the intended local-fresh-food behavior.
- Navi should sound more natural and less repetitive when responding.

## 2. Landing-page subject chips were redesigned and connected to search intent

### Subject chips were replaced
The old landing chips:
- Find Produce
- Learn to Grow
- Pick a System
- Sell Produce
- Get Service

Were replaced with:
- Fresh
- Cooked
- Meal Prep
- Receipes
- Advice

This keeps the landing experience more food-first and easier to understand for general users.

### Chips now influence backend search logic
- Previously, those landing chips were mostly visual/contextual and did not strongly affect backend search behavior.
- Today, tag-to-intent mapping was added so the selected chips now help determine search mode even when the user writes only a short prompt.

Current chip intent mapping:
- `Fresh` -> raw produce / market / grocery / farm-stand intent
- `Cooked` -> ready-to-eat / restaurant / cafe intent
- `Meal Prep` -> prepared-for-later intent
- `Receipes` -> recipe intent
- `Advice` -> advice/guidance intent without forcing unnecessary place search

### Current-location default remains in place
- We preserved the agreed behavior:
  - if the user does not specify an area, search defaults to current location
  - if the user wants another area, they need to say so directly in the prompt
- A reminder was added on the landing page to make that behavior clearer to users.

### Result
- The landing experience is now more aligned with how the AI actually interprets user intent.
- Users can guide the search more effectively with chips alone, even before typing a full message.

## 3. Store page was reworked into a more useful two-tab experience

### Store page structure changed
The Store page was updated to use two top-level tabs:
- `Fresh Produce`
- `Messages to Admin`

### Fresh Produce tab
- The first tab now focuses on a produce-oriented marketplace view instead of the previous mixed store layout.
- Mock content was adjusted to feel like a produce catalog rather than systems/supplies.
- The tab includes:
  - produce mock cards
  - category filtering
  - cleaner alignment with the current food-network direction

### Messages to Admin tab
- A new user-facing request flow was added asking:
  - "What type of store would you like to have here?"
- Users can type the type of store they want added to the platform.
- This content is now saved into a dedicated backend table called:
  - `messages_to_admin`

### Sign-in handling for store requests
- If a signed-out user writes a store request:
  - the request is saved locally
  - the user is sent to login
  - the request is restored after they return

### Result
- The Store page now supports both immediate browsing and future demand collection.
- We now have the first version of a real "user requests to admin" pipeline for platform planning.

## 4. Backend admin-message infrastructure was added

### New database-backed message flow
A new backend route and persistence layer were added for admin-bound requests.

New capability:
- authenticated users can submit messages to admin
- admin users can fetch those saved messages later

Stored fields include:
- user id
- subject
- message
- metadata/context
- status
- timestamps

### Why this matters
- This creates the foundation for an eventual admin inbox inside the app dashboard.
- The Store-page requests are now structured data, not just temporary UI text.

## 5. Verification completed

Build verification completed successfully after the changes:
- `npm run build --prefix server`
- `npm run build --prefix client`

The recurring Next.js warnings remained unchanged and were not introduced by today's work:
- baseline-browser-mapping age warning
- multiple lockfile root warning
- middleware/proxy deprecation warning

## Files touched today

Frontend:
- `client/src/components/LandingChatInterface.tsx`
- `client/src/components/AgriDashboard.tsx`
- `client/src/app/store/page.tsx`

Backend:
- `server/src/routes/chat.ts`
- `server/src/routes/messages-to-admin.ts`
- `server/src/index.ts`
- `server/src/schema.sql`
- `server/src/scripts/migrate.ts`

## Good next steps

1. Add an actual admin inbox view that reads from `GET /messages-to-admin`.
2. Add manual area-selection UI for users who prefer not to type a location in the chat prompt.
3. Expand Store requests beyond free text into structured choices later, such as:
   - natural food store
   - farmers market
   - herbal apothecary
   - smoothie bar
   - bulk ingredients store
4. Continue tuning fresh-food intent so "fresh" defaults even more strongly to markets unless a restaurant is explicitly requested.
