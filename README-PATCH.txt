ONLINE CHESS - SELECTION / LEGAL MOVE HIGHLIGHT FIX

Bug fixed:
- Selected piece and legal-move dots disappeared every ~800ms.
- Cause: polling/realtime refresh cleared local selection even when the game row had not changed.

Install:
1. Stop dev server (Ctrl+C).
2. Copy this folder's app/game/[gameId]/page.js into the same path in your project.
3. Overwrite the existing file.
4. Restart: npm run dev
5. Hard refresh the browser (Ctrl+Shift+R).

No Supabase SQL changes are required for this patch.
