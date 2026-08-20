import { requireUser } from '@/lib/auth-server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  const { gameId } = await params;
  const { user, error: authError } = await requireUser(request);
  if (!user) return Response.json({ error: authError }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (readError || !existing) {
    return Response.json({ error: 'Game not found.' }, { status: 404 });
  }

  if (existing.white_player_id === user.id || existing.black_player_id === user.id) {
    return Response.json({ game: existing });
  }

  if (existing.black_player_id) {
    return Response.json({ error: 'This game already has two players.' }, { status: 409 });
  }

  if (existing.status !== 'waiting') {
    return Response.json({ error: 'This game can no longer be joined.' }, { status: 409 });
  }

  const { data: joined, error: joinError } = await supabase
    .from('games')
    .update({
      black_player_id: user.id,
      status: 'active',
    })
    .eq('id', gameId)
    .is('black_player_id', null)
    .eq('status', 'waiting')
    .select('*')
    .maybeSingle();

  if (joinError) {
    console.error(joinError);
    return Response.json({ error: 'Could not join game.' }, { status: 500 });
  }

  if (joined) return Response.json({ game: joined });

  const { data: latest } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (latest?.black_player_id === user.id) return Response.json({ game: latest });

  return Response.json({ error: 'Another player joined first.' }, { status: 409 });
}
