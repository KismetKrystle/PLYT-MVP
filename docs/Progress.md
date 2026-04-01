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

# April 1, 2026

This note captures the work completed across auth/onboarding cleanup, AI chat behavior, profile/about-you expansion, mobile navigation, and lightweight user settings.

## 1. Auth, Clerk, and onboarding flow were stabilized

### Clerk connection and environment issues were resolved
- Clerk instance drift was traced to a stale local `.clerk/.tmp/keyless.json` file and mismatched local state.
- The app was moved back to an env-driven Clerk setup instead of relying on keyless metadata.
- The client env parsing issue was narrowed down to a UTF-16 encoded `client/.env.local`, which was converted back to UTF-8 so `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` could load correctly.
- The auth handoff now surfaces real backend verification errors instead of masking them behind generic timeout text.

### Sign-in/sign-up experience was unified
- Guest-triggered sign-in from chat now routes through the custom `/login` page instead of opening Clerk’s generic popup.
- The standalone auth pages were centered properly and removed from the normal app shell so they no longer inherit the left navigation layout.
- The extra outer wrapper around the Clerk sign-in/sign-up card was removed so the Clerk form renders as a single clean card.
- The Clerk card title was updated to show `Plyant`.

### Onboarding was simplified
- The visible role-selection step was removed from onboarding for now.
- Consumer onboarding remains active, while farmer/distributor/expert onboarding options were hidden until those flows are revisited.

## 2. Legal and landing-page trust assets were added

### Public legal pages were created
- Added:
  - `/privacy`
  - `/terms`
- These routes were made publicly accessible.

### Homepage legal links were added
- A small footer-style legal link block was added to the homepage so `app.plyant.com` visibly links to the privacy policy and terms.
- This was specifically done to support Google OAuth branding verification requirements.

## 3. AI chat behavior was significantly refined

### Persona and response style improvements
- The system prompt was updated so the AI:
  - focuses on helping users move toward better choices
  - avoids reinforcing illness identity
  - only centers conditions when explicitly needed or requested
- The tone was loosened to feel more conversational and less scripted.
- The AI was adjusted to give fuller food suggestions instead of falling back to thin “ingredient only” advice.
- Craving handling was improved so combo cravings like burger + saucy fries address both parts instead of only the headline food.

### Better intent control between food guidance and place search
- Place search logic was tightened so broad cravings do not automatically force “places mode.”
- Place activation now depends on clearer fulfillment/place intent instead of defaulting to restaurant/cafe results.
- The backend now supports companion place suggestions derived from the AI’s food recommendations, so users can get relevant nearby options without making places the primary answer.
- The client was fixed so AI-derived place queries from the final chat response actually trigger suggestion-panel fetches.

### Place suggestions became secondary to the food answer
- The main food suggestion remains the primary response.
- Suggested places are treated as secondary support unless the user explicitly asks for places.
- Broad prompts now ask a short clarifying follow-up question instead of overloading the user with place results too early.

### Suggested-panel and in-chat place behavior improved
- The right-side suggestion panel now shows the top 6 place matches first with a “show more” pattern.
- On mobile, the suggestion-panel toggle now gets a blinking green pulse when suggested places are available but the panel is still collapsed.
- In-chat place references were cleaned up so place names are not awkwardly duplicated with raw URLs when the panel already contains those results.
- Fake/generic fallback place cards were removed. The app now prefers showing no places over showing misleading placeholder results.
- Broken place image handling was improved with safer thumbnail fallback behavior.

## 4. About You was expanded into a richer personal hub

### Surface-level cleanup and naming updates
- The left nav label `Personal Health Archive` was changed to `Personal Health`, and later updated again to `Living Library`.
- The `Knowledge Bank` card on About You was hidden/replaced because About You now covers much of that same personal-content surface.
- `Community Wall` was renamed to `Journal Wall`.

### New and expanded About You cards
- Added or expanded support for:
  - Journal Wall
  - editable Videos I Love
  - editable Recipes
  - editable Meal Plan modal
  - Food I Eat produce gallery
  - Supplements card
- The `Food I Eat` section was reworked into a produce gallery with nutritional facts and benefits instead of an order flow.
- A starter in-app produce dataset was added with 10 common vegetables and their nutritional highlights.
- The produce modal was restructured to show the detail card first and the searchable gallery below it.

### Journal / Journeys flow was unified
- A dedicated `/journal` page was added.
- Journal entries now support:
  - text
  - optional image URL
  - optional tags
  - add/edit/delete
- The About You Journal Wall now previews the same underlying journal entries instead of acting like a separate mock-only feed.
- Mock entries were also added for empty states so users can visualize how the journal area should be used.

### Meal plan and streak behavior improved
- The meal plan card now opens a real editable modal.
- Users can edit the meal plan and reset it back to the auto-plan.
- The card labels were simplified to `Edit` and `Rest` per the requested wording.
- The streak card was turned into a daily consistency counter that increments once per day when the app is used.

### Supplements are now persisted
- Supplements were added as a new card in place of the old knowledge-bank surface.
- Supplement add/edit/delete is now saved into existing profile JSON storage:
  - `consumer_profiles.profile_data.supplements`
  - mirrored in `users.profile_data.supplements`

## 5. Navigation and mobile experience were streamlined

### Desktop/sidebar simplification
- Hidden or commented out for now:
  - Living Library in the left nav
  - Store
  - Orders
  - Wallet
  - Guide
  - extra profile links/admin shortcuts in the dropdown
- Wallet balance and store/cart icons were also hidden from header/dropdown surfaces.

### Mobile navigation cleanup
- The floating bottom legal/footer pill was hidden on mobile.
- The top-left mobile arrow was corrected:
  - first to stop routing to the farmer dashboard
  - later changed into a true back button
- The bottom-left hamburger now toggles the left panel open/closed.
- The mobile center home icon now opens About You instead of falling into the old farmer-dashboard behavior.
- The right-side mobile shortcut was changed from store to a temporary `HP` badge for health profile access.
- A heart shortcut was added to mobile bottom nav and wired to open About You focused on favorites.
- The mobile top-right profile/settings trigger was restored after it disappeared during earlier layout cleanup.

## 6. Settings were added as a lightweight first version

### New settings page
- A `/settings` page was added and linked from the profile dropdown.
- The save action was moved to the bottom of the page and relabeled to `Save`.

### Settings currently supported
- AI response style:
  - concise vs detailed
- Fulfillment bias:
  - recipe-first vs order-first vs balanced
- Proactive follow-up:
  - on/off
- Default search radius
- Chat retention preference:
  - 1 day
  - 7 days
  - 30 days
  - keep saved chats only

### Integration level
- These settings were wired into chat behavior and retention logic in a lightweight, low-risk way.
- Email/password recovery and account credential changes were intentionally left under Clerk.

## 7. Feedback pipeline was surfaced in the app

### Header feedback entry point
- Added a `?` button in the top navigation next to the profile icon.
- It opens a suggestion/bug modal.

### Feedback persistence
- The existing `messages_to_admin` pipeline was reused rather than creating a second feedback backend.
- The route was expanded to support guest submissions as well as authenticated submissions.
- Guests can now send feedback with an optional email address for follow-up.

## 8. Store and role-routing issues were reduced

### Store behavior
- The old `Store` nav path was causing users to fall into distributor/farmer dashboard behavior.
- The nav was moved to `/store`, and the store page was updated to reflect real inventory search behavior instead of bouncing into role dashboards.

### Role dashboard takeover was reduced
- `AgriDashboard` was adjusted so non-home tabs like Guide or About You stop being hijacked by farmer/distributor dashboard delegation.
- A hook-order bug in `AgriDashboard` was fixed by removing early role-based returns before all hooks were declared.

## 9. Verification completed

Build verification succeeded repeatedly during this work:
- `npm run build --prefix client`
- `npm run build --prefix server`

Warnings remained but were unchanged in nature:
- multiple lockfile / `turbopack.root` warning
- middleware/proxy deprecation warning

## Files most heavily touched

Frontend:
- `client/src/components/AppLayout.tsx`
- `client/src/components/AgriDashboard.tsx`
- `client/src/components/profile/PublicProfileV2.tsx`
- `client/src/app/login/[[...sign-in]]/page.tsx`
- `client/src/app/signup/[[...sign-up]]/page.tsx`
- `client/src/app/settings/page.tsx`
- `client/src/app/journal/page.tsx`
- `client/src/lib/journal.ts`

Backend:
- `server/src/routes/chat.ts`
- `server/src/config/system_prompt.ts`
- `server/src/routes/messages-to-admin.ts`
- `server/src/routes/user.ts`

## Good next steps

1. Revisit farmer/distributor/expert onboarding and dashboard flows once the consumer experience is fully stable.
2. Decide whether journal images should move from URL-only to file upload/storage later.
3. Expand produce and supplement datasets into a fuller managed library over time.
4. Add an internal admin inbox/view for feedback and messages-to-admin.
5. Continue tightening AI follow-up logic so it stays helpful without becoming repetitive.

## 10. About You was expanded into a fuller personal content hub

### About You view and structure
- Added a `Cards | List` toggle to the About You page.
- The list view was simplified into a title-first accordion so users see section names first and expand only what they need.
- The About You component was partially split into smaller files to keep the main page safer to maintain:
  - `client/src/components/profile/about-you/AboutYouListPanel.tsx`
  - `client/src/components/profile/about-you/SupplementsModalSection.tsx`
  - `client/src/components/profile/about-you/HerbsModalSection.tsx`
  - `client/src/components/profile/about-you/helpers.ts`
  - `client/src/components/profile/about-you/types.ts`

### Herbs and card layout updates
- The old `Journeys` surface was removed.
- A new `Herbs` card and herb modal flow were added, following the supplement pattern.
- Herb data was added to the user profile sync whitelist so it can live alongside supplements.
- The card grid was rearranged:
  - meal plan moved into the old wide supplement slot
  - herbs and supplements now sit side by side
  - herbs and supplements both use image-led card styling

### Journal Wall became a controllable mixed feed
- The wall no longer swaps demo posts out the moment a user adds a real post.
- Real journal entries and example entries are now shown together.
- Example entries can be removed individually.
- Wall entries now use a three-dot menu with:
  - `Edit text`
  - `Delete`
- Editing from the wall is intentionally limited to the body text of the post.

### Recipes became real saved content, not just titles
- Recipes now support:
  - title
  - image
  - description
  - ingredients
  - instructions
  - tags
- Clicking a recipe now opens a dedicated recipe detail view inside the recipe modal instead of only showing the recipe library grid.
- The recipe editor was expanded to capture ingredients and instructions line by line.

### Favorites were hidden for this phase
- Favorites were temporarily turned off in the About You experience.
- The app is currently being treated as a private personal-content experience first.
- Social/community-facing favorite behavior is being deferred to a later phase.
