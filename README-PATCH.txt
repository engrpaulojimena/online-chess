ONLINE CHESS — BLACK MOVE / SELECTION FIX

What this fixes
- Black legal-move dots/highlights no longer disappear because of duplicate Realtime/polling packets.
- Sync metadata/version differences no longer clear the selected piece.
- Polling no longer replaces React session state every cycle.
- Poll fallback changed from 800ms to 1200ms to reduce unnecessary UI churn.
- Keeps the existing rematch / same-link and session-refresh behavior.

Install
1. Stop dev server: Ctrl+C
2. Copy this file into your project and overwrite:
   app/game/[gameId]/page.js
3. Start again:
   npm run dev
4. Hard refresh both players (Ctrl+Shift+R).

No Supabase SQL changes are needed.
