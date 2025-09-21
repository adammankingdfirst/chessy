export type PieceColor = 'white' | 'black';
export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type Square = string; // e.g., 'e4', 'a1'

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface Position {
  [square: string]: Piece | null;
}

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  castling?: 'kingside' | 'queenside';
  enPassant?: boolean;
}

export interface GameState {
  position: Position;
  activeColor: PieceColor;
  castlingRights: {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
  };
  enPassantTarget: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  moveHistory: Move[];
}

export interface AIConfig {
  depth: number;
  timeLimit: number; // milliseconds
  useOpeningBook: boolean;
  useEndgameTablebase: boolean;
}

export type GameMode = 'pvp' | 'pvc' | 'cvc' | 'online' | 'p2p';

export interface NetworkMessage {
  type: 'move' | 'gameState' | 'chat' | 'disconnect' | 'reconnect';
  data: any;
  timestamp: number;
}

export interface GameResult {
  winner: PieceColor | 'draw';
  reason: 'checkmate' | 'stalemate' | 'insufficient-material' | 'fifty-move' | 'threefold-repetition' | 'resignation' | 'timeout';
}