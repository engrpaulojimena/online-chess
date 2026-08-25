ONLINE CHESS RUNTIME FIX

Fixes the captured-pieces runtime crash caused by using chess.SQUARES from a Chess instance.

Overwrite:
  app/game/[gameId]/page.js

Then:
  git add .
  git commit -m "Fix captured pieces runtime crash"
  git push

Vercel should redeploy automatically.
