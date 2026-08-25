'use client';

import { Chess } from 'chess.js';

export const PIECE_IMAGES = {
  wk: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  wq: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  wr: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  wb: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  wn: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  wp: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  bk: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  bq: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  br: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  bb: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  bn: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  bp: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
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
                  <img
                    src={PIECE_IMAGES[`${piece.color}${piece.type}`]}
                    alt={`${piece.color === 'w' ? 'white' : 'black'} ${piece.type}`}
                    draggable="false"
                  />
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
