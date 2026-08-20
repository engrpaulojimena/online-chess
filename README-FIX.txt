ONLINE CHESS - COMPLETE FIX BUILD
=================================

This package is meant to REPLACE/OVERWRITE the files in your existing project.
It includes all API routes so you do not end up with a partial patch.

IMPORTANT FILES INCLUDED
------------------------
app/api/games/route.js                    Create game
app/api/games/[gameId]/route.js           Read/sync game
app/api/games/[gameId]/join/route.js      Join game
app/api/games/[gameId]/move/route.js      Submit move
app/api/games/[gameId]/resign/route.js    Resign
app/api/health/route.js                    Quick API test
app/game/[gameId]/page.js                 Realtime + 800ms fallback sync
lib/supabase-browser.js                   One anonymous sign-in per browser session
lib/api-client.js                         Safe JSON/API error handling
supabase/realtime-fix.sql                  Grants + realtime publication

HOW TO APPLY
------------
1. Stop Next.js (Ctrl+C).
2. Extract this ZIP.
3. Copy ALL files/folders from the extracted folder into the ROOT of your current project.
4. Choose Replace/Overwrite when asked.
5. Do NOT copy your .env.local into this ZIP. Keep your existing .env.local.
6. In Supabase SQL Editor, run: supabase/realtime-fix.sql
7. Start again: npm run dev
8. Open: http://localhost:3000/api/health
   Expected JSON: {"ok":true,...}
9. Clear localhost site data in Chrome and Edge, or use Incognito/InPrivate.
10. Chrome creates game; Edge opens invite link.

If /api/health shows a normal Next.js HTML 404 page instead of JSON, the files were copied to the wrong directory. The app/api folder must sit beside app/page.js and package.json in the project root.

ENV REQUIRED
------------
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

SUPABASE_JWKS_URL is not required by this project.

SECURITY
--------
If a secret key was shown in a screenshot, rotate it in Supabase and update .env.local.
