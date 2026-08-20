'use client';

import { Chess } from 'chess.js';

const PIECES = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const WHITE_RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const BLACK_RANKS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ChessBoard({
  fen,
  orientation = 'white',
  selectedSquare,
  legalTargets,
  lastMove,
  onSquareClick,
  disabled,
}) {
  const chess = new Chess(fen);
  const files = orientation === 'white' ? FILES : [...FILES].reverse();
  const ranks = orientation === 'white' ? WHITE_RANKS : BLACK_RANKS;

  return (
    <div className={`chessboard ${disabled ? 'board-disabled' : ''}`}>
      {ranks.flatMap((rank, rankIndex) =>
        files.map((file, fileIndex) => {
          const square = `${file}${rank}`;
          const piece = chess.get(square);
          const isLight = (FILES.indexOf(file) + rank) % 2 === 1;
          const isSelected = selectedSquare === square;
          const isLegal = legalTargets.includes(square);
          const isLastMove = lastMove?.from === square || lastMove?.to === square;
          const showFile = rankIndex === 7;
          const showRank = fileIndex === 0;

          return (
            <button
              key={square}
              type="button"
              className={[
                'square',
                isLight ? 'light-square' : 'dark-square',
                isSelected ? 'selected-square' : '',
                isLastMove ? 'last-move-square' : '',
              ].join(' ')}
              onClick={() => onSquareClick(square)}
              aria-label={square}
              disabled={disabled}
            >
              {piece ? (
                <span className={`piece piece-${piece.color}`}>
                  {PIECES[`${piece.color}${piece.type}`]}
                </span>
              ) : null}

              {isLegal ? (
                <span className={piece ? 'legal-ring' : 'legal-dot'} aria-hidden="true" />
              ) : null}

              {showFile ? <span className="coord coord-file">{file}</span> : null}
              {showRank ? <span className="coord coord-rank">{rank}</span> : null}
            </button>
          );
        }),
      )}
    </div>
  );
}
