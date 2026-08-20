# Online Chess — Next.js + Supabase

A two-player realtime chess MVP that works across different devices.

## Included

- Next.js 16 App Router, JavaScript only
- Supabase Anonymous Auth
- Private game links using UUIDs
- Player 1 = White, first other browser to open the link = Black
- Server-side move validation with `chess.js`
- Realtime board updates through Supabase Postgres Changes
- Checkmate, stalemate/draw handling, threefold repetition, insufficient material, 50-move rule
- Castling and en passant through `chess.js`
- Promotion UI (Queen / Rook / Bishop / Knight)
- Resign button
- PGN stored on the game row
- Move audit log
- Optimistic concurrency using a `version` column to reject stale/duplicate move writes

## 1. Create a Supabase project

Create a new project at Supabase.

### Enable anonymous sign-ins

In the Supabase Dashboard, enable **Anonymous Sign-Ins** under Authentication settings.

Anonymous users still receive authenticated user sessions, which this project uses to identify White and Black without requiring email/password registration.

## 2. Run the database schema

Open:

`supabase/schema.sql`

Copy the entire file into **Supabase Dashboard → SQL Editor** and run it.

The schema creates:

- `games`
- `moves`
- RLS policies
- indexes
- an `updated_at` trigger
- Realtime publication setup for `games`

## 3. Get your Supabase keys

Use the current Supabase API keys:

- **Project URL**
- **Publishable key** (`sb_publishable_...`) — safe for browser use
- **Secret key** (`sb_secret_...`) — server only, NEVER expose this in client code

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill it in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVER_ONLY_KEY
```

## 4. Install and run

Recommended: Node.js 20+.

```bash
npm install
npm run dev
```

Open:

`http://localhost:3000`

## 5. Test on two devices

For a true two-device local test, both devices need to reach the same Next.js server.

The easiest production-like test is to deploy the project to Vercel, add the same three environment variables there, then open the deployed URL.

Flow:

1. Device A clicks **Create Online Game**.
2. Device A copies the game URL.
3. Device B opens that exact URL in a different browser/device.
4. Device A is White; Device B becomes Black.
5. Moves are validated by the Next.js API route, saved to Supabase, and sent to the other device through Realtime.

## Security model

The browser does **not** have permission to insert/update `games` or `moves` directly.

Every move is sent to:

`POST /api/games/[gameId]/move`

That API route:

1. verifies the Supabase user access token,
2. checks that the user owns the side whose turn it is,
3. reconstructs the chess game from PGN,
4. checks the move with `chess.js`,
5. saves the new FEN + PGN only if the row version is still current.

The `SUPABASE_SECRET_KEY` is used only in server-side route handlers.

## Important notes

- Anonymous identity is stored in that browser's Supabase session. If a player clears site data or signs out, that browser loses its seat identity for the existing game.
- This MVP supports exactly two players and no spectators.
- It uses Supabase **Postgres Changes** because it is straightforward for an MVP. For a much larger production deployment, Supabase currently recommends Broadcast for better scalability/security patterns.
- For ranked games, timers, anti-cheat, matchmaking, rematches, accounts, ratings, or server-enforced clocks, extend the server/data model before treating it as a competitive chess platform.

## Project structure

```text
online-chess-nextjs/
├── app/
│   ├── api/games/
│   │   ├── route.js
│   │   └── [gameId]/
│   │       ├── join/route.js
│   │       ├── move/route.js
│   │       └── resign/route.js
│   ├── game/[gameId]/page.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   └── ChessBoard.js
├── lib/
│   ├── auth-server.js
│   ├── supabase-browser.js
│   └── supabase-server.js
├── supabase/
│   └── schema.sql
├── .env.example
├── package.json
└── README.md
```
