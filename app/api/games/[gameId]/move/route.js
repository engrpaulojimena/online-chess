import { Chess } from 'chess.js';
import { requireUser } from '@/lib/auth-server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const SQUARE_RE = /^[a-h][1-8]$/;
const PROMOTIONS = new Set(['q', 'r', 'b', 'n']);

function drawReason(chess) {
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isThreefoldRepetition()) return 'threefold repetition';
  if (chess.isInsufficientMaterial()) return 'insufficient material';
  if (chess.isDrawByFiftyMoves()) return '50-move rule';
  return 'draw';
}

export async function POST(request, { params }) {
  const { gameId } = await params;
  const { user, error: authError } = await requireUser(request);
  if (!user) return Response.json({ error: authError }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const from = String(body.from || '').toLowerCase();
  const to = String(body.to || '').toLowerCase();
  const promotion = String(body.promotion || 'q').toLowerCase();

  if (!SQUARE_RE.test(from) || !SQUARE_RE.test(to) || !PROMOTIONS.has(promotion)) {
    return Response.json({ error: 'Invalid move payload.' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data: game, error: readError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (readError || !game) return Response.json({ error: 'Game not found.' }, { status: 404 });
  if (game.status !== 'active') return Response.json({ error: 'Game is not active.' }, { status: 409 });

  const chess = new Chess();
  if (game.pgn?.trim()) {
    try {
      chess.loadPgn(game.pgn);
    } catch {
      return Response.json({ error: 'Stored game state is invalid.' }, { status: 500 });
    }
  }

  if (chess.fen() !== game.fen) {
    return Response.json({ error: 'Stored game state is out of sync.' }, { status: 500 });
  }

  const movingColor = chess.turn() === 'w' ? 'white' : 'black';
  const expectedPlayerId = movingColor === 'white' ? game.white_player_id : game.black_player_id;

  if (user.id !== expectedPlayerId) {
    return Response.json({ error: 'It is not your turn.' }, { status: 403 });
  }

  let move;
  try {
    move = chess.move({ from, to, promotion });
  } catch {
    move = null;
  }

  if (!move) return Response.json({ error: 'Illegal chess move.' }, { status: 400 });

  let status = 'active';
  let winnerId = null;
  let reason = null;

  if (chess.isCheckmate()) {
    status = 'checkmate';
    winnerId = user.id;
  } else if (chess.isGameOver()) {
    status = 'draw';
    reason = drawReason(chess);
  }

  const nextVersion = game.version + 1;
  const updatePayload = {
    fen: chess.fen(),
    pgn: chess.pgn(),
    turn: chess.turn() === 'w' ? 'white' : 'black',
    status,
    winner_id: winnerId,
    draw_reason: reason,
    last_move: `${move.from}-${move.to}`,
    last_move_san: move.san,
    version: nextVersion,
  };

  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update(updatePayload)
    .eq('id', gameId)
    .eq('version', game.version)
    .eq('status', 'active')
    .select('*')
    .maybeSingle();

  if (updateError) {
    console.error(updateError);
    return Response.json({ error: 'Could not save move.' }, { status: 500 });
  }

  if (!updatedGame) {
    return Response.json({ error: 'Game changed before this move was saved. Try again.' }, { status: 409 });
  }

  const { error: moveLogError } = await supabase.from('moves').insert({
    game_id: gameId,
    player_id: user.id,
    ply_number: nextVersion,
    color: movingColor,
    from_square: move.from,
    to_square: move.to,
    promotion: move.promotion || null,
    san: move.san,
    fen_after: chess.fen(),
  });

  if (moveLogError) console.error('Move log insert failed:', moveLogError);

  return Response.json({ game: updatedGame });
}
