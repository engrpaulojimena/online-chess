import { Chess } from 'chess.js';
import { requireUser } from '@/lib/auth-server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const RESTARTABLE_STATUSES = new Set(['checkmate', 'draw', 'resigned']);

export async function POST(request, { params }) {
  const { gameId } = await params;
  const { user, error: authError } = await requireUser(request);

  if (!user) {
    return Response.json({ error: authError || 'Invalid or expired session.' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data: game, error: readError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (readError || !game) {
    return Response.json({ error: 'Game not found.' }, { status: 404 });
  }

  const isPlayer = game.white_player_id === user.id || game.black_player_id === user.id;
  if (!isPlayer) {
    return Response.json({ error: 'You are not a player in this game.' }, { status: 403 });
  }

  if (!game.black_player_id) {
    return Response.json({ error: 'Wait for the second player before restarting.' }, { status: 409 });
  }

  if (!RESTARTABLE_STATUSES.has(game.status)) {
    return Response.json(
      { error: 'Finish the current game before starting a new round.' },
      { status: 409 },
    );
  }

  // The current schema has UNIQUE(game_id, ply_number) in public.moves.
  // A rematch starts again at ply 1, so clear the previous round's move rows.
  // The room/game row and both player IDs are kept, so the invite URL stays the same.
  const { error: deleteMovesError } = await supabase
    .from('moves')
    .delete()
    .eq('game_id', gameId);

  if (deleteMovesError) {
    console.error(deleteMovesError);
    return Response.json({ error: 'Could not clear the previous round.' }, { status: 500 });
  }

  const chess = new Chess();
  const nextVersion = Number(game.version ?? 0) + 1;

  const { data: restarted, error: updateError } = await supabase
    .from('games')
    .update({
      fen: chess.fen(),
      pgn: '',
      turn: 'white',
      status: 'active',
      winner_id: null,
      draw_reason: null,
      last_move: null,
      last_move_san: null,
      version: nextVersion,
    })
    .eq('id', gameId)
    .in('status', ['checkmate', 'draw', 'resigned'])
    .select('*')
    .maybeSingle();

  if (updateError) {
    console.error(updateError);
    return Response.json({ error: 'Could not restart game.' }, { status: 500 });
  }

  if (!restarted) {
    return Response.json({ error: 'Game already changed. Refresh and try again.' }, { status: 409 });
  }

  return Response.json({ game: restarted });
}
