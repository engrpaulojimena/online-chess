'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureAnonymousSession } from '@/lib/supabase-browser';
import { fetchJson } from '@/lib/api-client';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function createGame() {
    setLoading(true);
    setError('');

    try {
      const session = await ensureAnonymousSession();
      const result = await fetchJson('/api/games', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      router.push(`/game/${result.game.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="home-shell">
      <section className="hero-card">
        <div className="brand-chip">♟ REALTIME CHESS</div>
        <h1>Play chess from two different devices.</h1>
        <p>
          Create a private game, send the link to your opponent, and every legal move
          syncs in realtime through Supabase.
        </p>

        <button className="primary-button" onClick={createGame} disabled={loading}>
          {loading ? 'Creating game…' : 'Create Online Game'}
        </button>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="feature-grid">
          <div>
            <strong>Private link</strong>
            <span>UUID game rooms</span>
          </div>
          <div>
            <strong>Realtime</strong>
            <span>No manual refresh</span>
          </div>
          <div>
            <strong>Validated</strong>
            <span>Moves checked on server</span>
          </div>
        </div>
      </section>
    </main>
  );
}
