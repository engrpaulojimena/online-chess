-- Run once in Supabase Dashboard -> SQL Editor.
-- Safe to run more than once.

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.games TO authenticated;
GRANT SELECT ON TABLE public.moves TO authenticated;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.games TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.moves TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "players can read their games" ON public.games;
CREATE POLICY "players can read their games"
ON public.games
FOR SELECT
TO authenticated
USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;
END
$$;
