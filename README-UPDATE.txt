ONLINE CHESS - CHROME/EDGE SYNC FIX
===================================

ROOT CAUSE FIXED
----------------
1. Next/React development mode can run effects twice.
2. Two simultaneous anonymous sign-ins could create two different users in one browser.
3. That can cause: "Another player joined first." and break the expected player/realtime state.
4. This patch locks anonymous sign-in to one request.
5. It keeps Supabase Realtime and adds a 1.2-second server polling fallback.

COPY THESE FILES INTO YOUR EXISTING PROJECT
-------------------------------------------
Paste this ZIP's contents into the ROOT of your existing project and overwrite when asked:

lib/supabase-browser.js
app/game/[gameId]/page.js
app/api/games/[gameId]/route.js
supabase/realtime-fix.sql

SUPABASE STEP
-------------
Open Supabase Dashboard -> SQL Editor.
Run:
  supabase/realtime-fix.sql

THEN RESTART NEXT.JS
--------------------
Ctrl + C
npm run dev

TEST CLEANLY
------------
Because the old Chrome/Edge sessions may already contain the raced anonymous users:

Option A (recommended):
- Clear site data for localhost:3000 in BOTH Chrome and Edge.
- Or use a fresh Incognito/InPrivate window in both browsers.

Then:
1. Chrome -> http://localhost:3000 -> Create Game.
2. Copy invite URL.
3. Edge -> open same URL -> joins as Black.
4. Make White move in Chrome.
5. Edge should update automatically (Realtime immediately; fallback within ~1.2 sec).
6. Make Black move in Edge; Chrome should update too.

You should NOT see "Another player joined first." for the browser that actually became Black.
