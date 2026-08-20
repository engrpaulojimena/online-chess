import { requireUser } from '@/lib/auth-server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const { gameId } = await params;
  const { user, error: authError } = await requireUser(request);
  if (!user) return Response.json({ error: authError }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data: game, error: readError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (readError || !game) return Response.json({ error: 'Game not found.' }, { status: 404 });
  if (game.status !== 'active') return Response.json({ error: 'Game is not active.' }, { status: 409 });

  const isWhite = game.white_player_id === user.id;
  const isBlack = game.black_player_id === user.id;
  if (!isWhite && !isBlack) return Response.json({ error: 'You are not a player in this game.' }, { status: 403 });

  const winnerId = isWhite ? game.black_player_id : game.white_player_id;

  const { data: updated, error: updateError } = await supabase
    .from('games')
    .update({ status: 'resigned', winner_id: winnerId })
    .eq('id', gameId)
    .eq('status', 'active')
    .select('*')
    .maybeSingle();

  if (updateError) {
    console.error(updateError);
    return Response.json({ error: 'Could not resign.' }, { status: 500 });
  }

  if (!updated) return Response.json({ error: 'Game already ended.' }, { status: 409 });
  return Response.json({ game: updated });
}
