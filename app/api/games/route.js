import { Chess } from 'chess.js';
import { requireUser } from '@/lib/auth-server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(request) {
  const { user, error: authError } = await requireUser(request);
  if (!user) return Response.json({ error: authError }, { status: 401 });

  const chess = new Chess();
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('games')
    .insert({
      white_player_id: user.id,
      fen: chess.fen(),
      pgn: '',
      turn: 'white',
      status: 'waiting',
      version: 0,
    })
    .select('*')
    .single();

  if (error) {
    console.error(error);
    return Response.json({ error: 'Could not create game.' }, { status: 500 });
  }

  return Response.json({ game: data }, { status: 201 });
}
