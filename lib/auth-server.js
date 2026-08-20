import { createSupabaseAuthVerifier } from '@/lib/supabase-server';

export async function requireUser(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { user: null, error: 'Missing bearer token.' };
  }

  const supabase = createSupabaseAuthVerifier();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { user: null, error: 'Invalid or expired session.' };
  }

  return { user: data.user, error: null };
}
