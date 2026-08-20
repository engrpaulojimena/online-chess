'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Chess } from 'chess.js';
import ChessBoard from '@/components/ChessBoard';
import { ensureAnonymousSession, getActiveSession, getSupabaseBrowser } from '@/lib/supabase-browser';
import { fetchJson } from '@/lib/api-client';

function parseLastMove(value) {
  if (!value || !value.includes('-')) return null;
  const [from, to] = value.split('-');
  return { from, to };
}

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId;

  const [session, setSession] = useState(null);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const gameRef = useRef(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const myColor = useMemo(() => {
    if (!game || !session) return null;
    if (game.white_player_id === session.user.id) return 'white';
    if (game.black_player_id === session.user.id) return 'black';
    return null;
  }, [game, session]);

  const chess = useMemo(() => {
    if (!game?.fen) return null;
    return new Chess(game.fen);
  }, [game?.fen]);

  const isMyTurn = Boolean(
    game && myColor && game.status === 'active' && game.turn === myColor,
  );

  const loadAndJoin = useCallback(async () => {
    const currentSession = await ensureAnonymousSession();
    setSession(currentSession);

    const result = await fetchJson(`/api/games/${encodeURIComponent(gameId)}/join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    });

    gameRef.current = result.game;
    setGame(result.game);
    return currentSession;
  }, [gameId]);

  useEffect(() => {
    let channel;
    let pollTimer;
    let cancelled = false;

    function applyRemoteGame(nextGame) {
      if (cancelled || !nextGame) return;

      const current = gameRef.current;
      let boardPositionChanged = false;

      // Realtime and polling can return the SAME chess position with slightly
      // different metadata (for example version representation / delivery order).
      // That must never wipe the selected piece, especially on the Black board.
      if (current) {
        const currentVersion = Number(current.version ?? 0);
        const nextVersion = Number(nextGame.version ?? 0);

        // Never replace a clearly newer local position with an older response.
        if (Number.isFinite(currentVersion) && Number.isFinite(nextVersion) && nextVersion < currentVersion) {
          return;
        }

        boardPositionChanged =
          nextGame.fen !== current.fen ||
          nextGame.turn !== current.turn ||
          nextGame.status !== current.status;

        const sameVisibleState =
          !boardPositionChanged &&
          nextGame.black_player_id === current.black_player_id &&
          nextGame.white_player_id === current.white_player_id &&
          nextGame.winner_id === current.winner_id &&
          nextGame.last_move === current.last_move &&
          nextGame.pgn === current.pgn;

        // Ignore duplicate sync packets. Version alone is NOT a reason to
        // re-render/clear the board selection.
        if (sameVisibleState) {
          if (nextVersion > currentVersion) {
            const merged = { ...current, ...nextGame };
            gameRef.current = merged;
            setGame(merged);
          }
          return;
        }
      } else {
        boardPositionChanged = true;
      }

      gameRef.current = nextGame;
      setGame(nextGame);

      // Clear source/target selection ONLY if the actual chess position changed
      // (a move arrived, turn changed, restart, or the game ended). Metadata-only
      // sync packets no longer make Black's legal-move dots disappear.
      if (boardPositionChanged) {
        setSelectedSquare(null);
        setLegalTargets([]);
        setPendingPromotion(null);
      }
    }

    async function refreshGame() {
      try {
        const activeSession = await getActiveSession();
        // Do not replace React session state on every poll. The user identity
        // does not change when Supabase refreshes the access token, and avoiding
        // this removes unnecessary board re-renders while choosing a move.
        const result = await fetchJson(`/api/games/${encodeURIComponent(gameId)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${activeSession.access_token}`,
          },
          cache: 'no-store',
        });
        applyRemoteGame(result.game);
      } catch (err) {
        // Realtime remains the primary path. Polling is only a fallback,
        // so a temporary network error should not break the board.
        console.warn('Game sync retry failed:', err);
      }
    }

    async function init() {
      try {
        const currentSession = await loadAndJoin();
        if (cancelled) return;

        const supabase = getSupabaseBrowser();
        await supabase.realtime.setAuth(currentSession.access_token);

        channel = supabase
          .channel(`game:${gameId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'games',
              filter: `id=eq.${gameId}`,
            },
            (payload) => {
              applyRemoteGame(payload.new);
            },
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn(`Realtime channel status: ${status}. Polling fallback is active.`);
            }
          });

        // Fallback sync for local/dev setups or projects where Realtime
        // publication has not been enabled yet. This also makes testing
        // across Chrome + Edge reliable.
        pollTimer = window.setInterval(() => {
          refreshGame();
        }, 1200);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
      if (channel) getSupabaseBrowser().removeChannel(channel);
    };
  }, [gameId, loadAndJoin]);

  async function submitMove(from, to, promotion = 'q') {
    if (!session || busy) return;
    setBusy(true);
    setError('');

    try {
      const activeSession = await getActiveSession();
      setSession(activeSession);
      const result = await fetchJson(`/api/games/${encodeURIComponent(gameId)}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        body: JSON.stringify({ from, to, promotion }),
      });

      gameRef.current = result.game;
      setGame(result.game);
      setSelectedSquare(null);
      setLegalTargets([]);
      setPendingPromotion(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function selectSquare(square) {
    if (!chess || !isMyTurn || busy) return;

    const colorCode = myColor === 'white' ? 'w' : 'b';
    const piece = chess.get(square);

    if (!selectedSquare) {
      if (!piece || piece.color !== colorCode) return;
      const moves = chess.moves({ square, verbose: true });
      if (!moves.length) return;
      setSelectedSquare(square);
      setLegalTargets([...new Set(moves.map((move) => move.to))]);
      return;
    }

    const candidateMoves = chess
      .moves({ square: selectedSquare, verbose: true })
      .filter((move) => move.to === square);

    if (candidateMoves.length) {
      const promotionMoves = candidateMoves.filter((move) => move.promotion);
      if (promotionMoves.length) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }

      submitMove(selectedSquare, square);
      return;
    }

    if (piece && piece.color === colorCode) {
      const moves = chess.moves({ square, verbose: true });
      setSelectedSquare(square);
      setLegalTargets([...new Set(moves.map((move) => move.to))]);
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.href);
    setNotice('Invite link copied.');
    window.setTimeout(() => setNotice(''), 1800);
  }

  async function resign() {
    if (!session || !game || game.status !== 'active' || busy) return;
    setBusy(true);
    setError('');

    try {
      const activeSession = await getActiveSession();
      setSession(activeSession);
      const result = await fetchJson(`/api/games/${encodeURIComponent(gameId)}/resign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
      });
      gameRef.current = result.game;
      setGame(result.game);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }


  async function restartGame() {
    if (!session || !game || !['checkmate', 'draw', 'resigned'].includes(game.status) || busy) return;

    const confirmed = window.confirm(
      'Start a new round with the same two players and the same invite link?',
    );
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const activeSession = await getActiveSession();
      setSession(activeSession);

      const result = await fetchJson(`/api/games/${encodeURIComponent(gameId)}/restart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
      });

      gameRef.current = result.game;
      setGame(result.game);
      setSelectedSquare(null);
      setLegalTargets([]);
      setPendingPromotion(null);
      setNotice('New round started — same link, same players.');
      window.setTimeout(() => setNotice(''), 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="center-screen"><div className="loading-card">Loading game…</div></main>;
  }

  if (error && !game) {
    return <main className="center-screen"><div className="loading-card error-text">{error}</div></main>;
  }

  if (!game) return null;

  const lastMove = parseLastMove(game.last_move);
  const winnerText = game.winner_id
    ? game.winner_id === session?.user.id
      ? 'You won'
      : 'Opponent won'
    : null;

  let statusText = 'Waiting for opponent';
  if (game.status === 'active') statusText = isMyTurn ? 'Your turn' : "Opponent's turn";
  if (game.status === 'checkmate') statusText = winnerText ? `${winnerText} by checkmate` : 'Checkmate';
  if (game.status === 'draw') statusText = `Draw${game.draw_reason ? ` — ${game.draw_reason}` : ''}`;
  if (game.status === 'resigned') statusText = winnerText ? `${winnerText} by resignation` : 'Game ended';

  return (
    <main className="game-shell">
      <section className="board-column">
        <div className="game-topbar">
          <div>
            <span className="eyebrow">PRIVATE GAME</span>
            <h1>Online Chess</h1>
          </div>
          <button className="secondary-button" onClick={copyInvite}>Copy Invite Link</button>
        </div>

        <ChessBoard
          fen={game.fen}
          orientation={myColor || 'white'}
          selectedSquare={selectedSquare}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onSquareClick={selectSquare}
          disabled={!isMyTurn || busy}
        />

        {pendingPromotion ? (
          <div className="promotion-panel">
            <span>Promote pawn to:</span>
            <div>
              {[
                ['q', 'Queen'],
                ['r', 'Rook'],
                ['b', 'Bishop'],
                ['n', 'Knight'],
              ].map(([piece, label]) => (
                <button
                  key={piece}
                  onClick={() => submitMove(pendingPromotion.from, pendingPromotion.to, piece)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <aside className="game-sidebar">
        <div className="status-card">
          <span className={`status-dot status-${game.status}`} />
          <div>
            <small>GAME STATUS</small>
            <strong>{statusText}</strong>
          </div>
        </div>

        <div className="info-card">
          <div className="info-row"><span>You are</span><strong>{myColor || '—'}</strong></div>
          <div className="info-row"><span>Turn</span><strong>{game.turn}</strong></div>
          <div className="info-row"><span>Game ID</span><code>{game.id.slice(0, 8)}…</code></div>
        </div>

        {game.status === 'waiting' ? (
          <div className="invite-card">
            <strong>Waiting for Player 2</strong>
            <p>Open this exact game link on the other device. The first other browser to open it becomes Black.</p>
            <button className="primary-button compact" onClick={copyInvite}>Copy Link</button>
          </div>
        ) : null}

        <div className="moves-card">
          <span className="eyebrow">PGN</span>
          <div className="pgn-box">{game.pgn || 'No moves yet.'}</div>
        </div>

        {game.status === 'active' ? (
          <button className="danger-button" onClick={resign} disabled={busy}>Resign Game</button>
        ) : null}

        {['checkmate', 'draw', 'resigned'].includes(game.status) ? (
          <button
            className="primary-button"
            style={{ width: '100%' }}
            onClick={restartGame}
            disabled={busy}
          >
            {busy ? 'Starting new round…' : 'Play Again — Same Link'}
          </button>
        ) : null}

        {notice ? <div className="toast">{notice}</div> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </aside>
    </main>
  );
}
