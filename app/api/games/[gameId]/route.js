import { requireUser } from '@/lib/auth-server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { gameId } = await params;
  const { user, error: authError } = await requireUser(request);

  if (!user) {
    return Response.json({ error: authError }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error || !game) {
    return Response.json({ error: 'Game not found.' }, { status: 404 });
  }

  const isPlayer = game.white_player_id === user.id || game.black_player_id === user.id;
  if (!isPlayer) {
    return Response.json({ error: 'You are not a player in this game.' }, { status: 403 });
  }

  return Response.json(
    { game },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
