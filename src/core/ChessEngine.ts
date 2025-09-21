import { GameState, Move, PieceColor, GameResult } from '../types/chess';
import { ChessBoard } from './ChessBoard';
import { MoveGenerator } from './MoveGenerator';

export class ChessEngine {
  private gameState: GameState;
  private moveHistory: string[] = [];

  constructor() {
    this.gameState = this.createInitialGameState();
  }

  private createInitialGameState(): GameState {
    return {
      position: ChessBoard.createInitialPosition(),
      activeColor: 'white',
      castlingRights: {
        whiteKingside: true,
        whiteQueenside: true,
        blackKingside: true,
        blackQueenside: true
      },
      enPassantTarget: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
      moveHistory: []
    };
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getLegalMoves(): Move[] {
    return MoveGenerator.generateLegalMoves(this.gameState);
  }

  makeMove(move: Move): boolean {
    const legalMoves = this.getLegalMoves();
    const isLegal = legalMoves.some(legalMove => 
      legalMove.from === move.from && 
      legalMove.to === move.to &&
      legalMove.promotion === move.promotion
    );

    if (!isLegal) return false;

    // Update game state
    this.gameState = this.applyMove(this.gameState, move);
    this.gameState.moveHistory.push(move);
    
    // Update move history for threefold repetition
    this.moveHistory.push(this.positionToFEN());

    return true;
  }

  private applyMove(gameState: GameState, move: Move): GameState {
    const newPosition = { ...gameState.position };
    const newGameState: GameState = {
      ...gameState,
      position: newPosition,
      activeColor: gameState.activeColor === 'white' ? 'black' : 'white',
      enPassantTarget: null,
      halfmoveClock: move.captured || move.piece.type === 'pawn' ? 0 : gameState.halfmoveClock + 1,
      fullmoveNumber: gameState.activeColor === 'black' ? gameState.fullmoveNumber + 1 : gameState.fullmoveNumber
    };

    // Make the move
    newPosition[move.to] = move.promotion ? 
      { type: move.promotion, color: move.piece.color } : move.piece;
    newPosition[move.from] = null;

    // Handle special moves
    if (move.castling) {
      if (move.castling === 'kingside') {
        const rookFrom = move.piece.color === 'white' ? 'h1' : 'h8';
        const rookTo = move.piece.color === 'white' ? 'f1' : 'f8';
        newPosition[rookTo] = newPosition[rookFrom];
        newPosition[rookFrom] = null;
      } else {
        const rookFrom = move.piece.color === 'white' ? 'a1' : 'a8';
        const rookTo = move.piece.color === 'white' ? 'd1' : 'd8';
        newPosition[rookTo] = newPosition[rookFrom];
        newPosition[rookFrom] = null;
      }
    }

    if (move.enPassant) {
      const capturedPawnSquare = move.piece.color === 'white' ? 
        move.to[0] + '5' : move.to[0] + '4';
      newPosition[capturedPawnSquare] = null;
    }

    // Set en passant target for pawn double moves
    if (move.piece.type === 'pawn') {
      const fromRank = parseInt(move.from[1]);
      const toRank = parseInt(move.to[1]);
      if (Math.abs(toRank - fromRank) === 2) {
        const enPassantRank = move.piece.color === 'white' ? '3' : '6';
        newGameState.enPassantTarget = move.from[0] + enPassantRank;
      }
    }

    // Update castling rights
    newGameState.castlingRights = { ...gameState.castlingRights };
    
    if (move.piece.type === 'king') {
      if (move.piece.color === 'white') {
        newGameState.castlingRights.whiteKingside = false;
        newGameState.castlingRights.whiteQueenside = false;
      } else {
        newGameState.castlingRights.blackKingside = false;
        newGameState.castlingRights.blackQueenside = false;
      }
    }

    if (move.piece.type === 'rook') {
      if (move.from === 'a1') newGameState.castlingRights.whiteQueenside = false;
      if (move.from === 'h1') newGameState.castlingRights.whiteKingside = false;
      if (move.from === 'a8') newGameState.castlingRights.blackQueenside = false;
      if (move.from === 'h8') newGameState.castlingRights.blackKingside = false;
    }

    return newGameState;
  }

  isGameOver(): GameResult | null {
    const legalMoves = this.getLegalMoves();
    const isInCheck = MoveGenerator.isInCheck(this.gameState, this.gameState.activeColor);

    // Checkmate
    if (legalMoves.length === 0 && isInCheck) {
      return {
        winner: this.gameState.activeColor === 'white' ? 'black' : 'white',
        reason: 'checkmate'
      };
    }

    // Stalemate
    if (legalMoves.length === 0 && !isInCheck) {
      return { winner: 'draw', reason: 'stalemate' };
    }

    // Fifty-move rule
    if (this.gameState.halfmoveClock >= 100) {
      return { winner: 'draw', reason: 'fifty-move' };
    }

    // Threefold repetition
    const currentPosition = this.positionToFEN();
    const repetitions = this.moveHistory.filter(pos => pos === currentPosition).length;
    if (repetitions >= 3) {
      return { winner: 'draw', reason: 'threefold-repetition' };
    }

    // Insufficient material
    if (this.isInsufficientMaterial()) {
      return { winner: 'draw', reason: 'insufficient-material' };
    }

    return null;
  }

  private isInsufficientMaterial(): boolean {
    const pieces = Object.values(this.gameState.position).filter(piece => piece !== null);
    
    // King vs King
    if (pieces.length === 2) return true;
    
    // King and Bishop vs King or King and Knight vs King
    if (pieces.length === 3) {
      const nonKingPieces = pieces.filter(piece => piece!.type !== 'king');
      return nonKingPieces.length === 1 && 
             (nonKingPieces[0]!.type === 'bishop' || nonKingPieces[0]!.type === 'knight');
    }

    return false;
  }

  private positionToFEN(): string {
    // Simplified FEN for position comparison
    let fen = '';
    for (let rank = 7; rank >= 0; rank--) {
      let emptyCount = 0;
      for (let file = 0; file < 8; file++) {
        const square = ChessBoard.coordinatesToSquare(file, rank);
        const piece = square ? this.gameState.position[square] : null;
        
        if (!piece) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          const pieceChar = this.pieceToChar(piece);
          fen += piece.color === 'white' ? pieceChar.toUpperCase() : pieceChar.toLowerCase();
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      if (rank > 0) fen += '/';
    }
    
    return fen;
  }

  private pieceToChar(piece: any): string {
    const chars: { [key: string]: string } = {
      'pawn': 'p', 'rook': 'r', 'knight': 'n',
      'bishop': 'b', 'queen': 'q', 'king': 'k'
    };
    return chars[piece.type] || '';
  }

  reset(): void {
    this.gameState = this.createInitialGameState();
    this.moveHistory = [];
  }
}