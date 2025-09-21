import { Position, Piece, PieceColor, PieceType, Square } from '../types/chess';

export class ChessBoard {
  private static readonly FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  private static readonly RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

  static createInitialPosition(): Position {
    const position: Position = {};
    
    // Initialize empty squares
    for (const file of this.FILES) {
      for (const rank of this.RANKS) {
        position[file + rank] = null;
      }
    }

    // Place white pieces
    const whitePieces: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    whitePieces.forEach((type, index) => {
      position[this.FILES[index] + '1'] = { type, color: 'white' };
    });
    
    // White pawns
    this.FILES.forEach(file => {
      position[file + '2'] = { type: 'pawn', color: 'white' };
    });

    // Place black pieces
    const blackPieces: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    blackPieces.forEach((type, index) => {
      position[this.FILES[index] + '8'] = { type, color: 'black' };
    });
    
    // Black pawns
    this.FILES.forEach(file => {
      position[file + '7'] = { type: 'pawn', color: 'black' };
    });

    return position;
  }

  static isValidSquare(square: Square): boolean {
    if (square.length !== 2) return false;
    const file = square[0];
    const rank = square[1];
    return this.FILES.includes(file) && this.RANKS.includes(rank);
  }

  static getSquareColor(square: Square): 'light' | 'dark' {
    const fileIndex = this.FILES.indexOf(square[0]);
    const rankIndex = this.RANKS.indexOf(square[1]);
    return (fileIndex + rankIndex) % 2 === 0 ? 'dark' : 'light';
  }

  static getDistance(from: Square, to: Square): { files: number; ranks: number } {
    const fromFile = this.FILES.indexOf(from[0]);
    const fromRank = this.RANKS.indexOf(from[1]);
    const toFile = this.FILES.indexOf(to[0]);
    const toRank = this.RANKS.indexOf(to[1]);

    return {
      files: Math.abs(toFile - fromFile),
      ranks: Math.abs(toRank - fromRank)
    };
  }

  static getSquaresBetween(from: Square, to: Square): Square[] {
    const squares: Square[] = [];
    const fromFile = this.FILES.indexOf(from[0]);
    const fromRank = this.RANKS.indexOf(from[1]);
    const toFile = this.FILES.indexOf(to[0]);
    const toRank = this.RANKS.indexOf(to[1]);

    const fileDirection = Math.sign(toFile - fromFile);
    const rankDirection = Math.sign(toRank - fromRank);

    let currentFile = fromFile + fileDirection;
    let currentRank = fromRank + rankDirection;

    while (currentFile !== toFile || currentRank !== toRank) {
      squares.push(this.FILES[currentFile] + this.RANKS[currentRank]);
      currentFile += fileDirection;
      currentRank += rankDirection;
    }

    return squares;
  }

  static getAllSquares(): Square[] {
    const squares: Square[] = [];
    for (const file of this.FILES) {
      for (const rank of this.RANKS) {
        squares.push(file + rank);
      }
    }
    return squares;
  }

  static squareToCoordinates(square: Square): { file: number; rank: number } {
    return {
      file: this.FILES.indexOf(square[0]),
      rank: this.RANKS.indexOf(square[1])
    };
  }

  static coordinatesToSquare(file: number, rank: number): Square | null {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return this.FILES[file] + this.RANKS[rank];
  }
}