ONLINE CHESS REALISTIC BOARD + CAPTURED PIECES PATCH

Overwrite these files in your project:
- app/game/[gameId]/page.js
- components/ChessBoard.js
- app/globals.css

Then restart:
  Ctrl + C
  npm run dev

If deployed on Vercel, redeploy after replacing the files.

What this patch adds:
- more realistic-looking chess pieces using SVG piece artwork
- wood-style board frame and more polished board styling
- captured enemy pieces shown in the sidebar
- material score chips (example: +3)
- keeps same-link restart support already built into the game page
