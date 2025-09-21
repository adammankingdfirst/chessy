import { GameState, Move, Piece, PieceColor, Square } from '../types/chess';
import { ChessBoard } from './ChessBoard';

export class MoveGenerator {
  static generateLegalMoves(gameState: GameState): Move[] {
    const pseudoLegalMoves = this.generatePseudoLegalMoves(gameState);
    return pseudoLegalMoves.filter(move => this.isLegalMove(gameState, move));
  }

  private static generatePseudoLegalMoves(gameState: GameState): Move[] {
    const moves: Move[] = [];
    const { position, activeColor } = gameState;

    for (const [square, piece] of Object.entries(position)) {
      if (piece && piece.color === activeColor) {
        moves.push(...this.generatePieceMoves(gameState, square as Square, piece));
      }
    }

    return moves;
  }

  private static generatePieceMoves(gameState: GameState, from: Square, piece: Piece): Move[] {
    switch (piece.type) {
      case 'pawn':
        return this.generatePawnMoves(gameState, from, piece);
      case 'rook':
        return this.generateRookMoves(gameState, from, piece);
      case 'knight':
        return this.generateKnightMoves(gameState, from, piece);
      case 'bishop':
        return this.generateBishopMoves(gameState, from, piece);
      case 'queen':
        return this.generateQueenMoves(gameState, from, piece);
      case 'king':
        return this.generateKingMoves(gameState, from, piece);
      default:
        return [];
    }
  }

  private static generatePawnMoves(gameState: GameState, from: Square, piece: Piece): Move[] {
    const moves: Move[] = [];
    const { position } = gameState;
    const direction = piece.color === 'white' ? 1 : -1;
    const startRank = piece.color === 'white' ? 1 : 6;
    const promotionRank = piece.color === 'white' ? 7 : 0;

    const fromCoords = ChessBoard.squareToCoordinates(from);
    const oneSquareForward = ChessBoard.coordinatesToSquare(fromCoords.file, fromCoords.rank + direction);
    
    // Forward moves
    if (oneSquareForward && !position[oneSquareForward]) {
      if (fromCoords.rank + direction === promotionRank) {
        // Promotion
        ['queen', 'rook', 'bishop', 'knight'].forEach(promotionPiece => {
          moves.push({
            from,
            to: oneSquareForward,
            piece,
            promotion: promotionPiece as any
          });
        });
      } else {
        moves.push({ from, to: oneSquareForward, piece });
        
        // Two squares forward from starting position
        if (fromCoords.rank === startRank) {
          const twoSquaresForward = ChessBoard.coordinatesToSquare(fromCoords.file, fromCoords.rank + 2 * direction);
          if (twoSquaresForward && !position[twoSquaresForward]) {
            moves.push({ from, to: twoSquaresForward, piece });
          }
        }
      }
    }

    // Captures
    [-1, 1].forEach(fileOffset => {
      const captureSquare = ChessBoard.coordinatesToSquare(fromCoords.file + fileOffset, fromCoords.rank + direction);
      if (captureSquare) {
        const targetPiece = position[captureSquare];
        if (targetPiece && targetPiece.color !== piece.color) {
          if (fromCoords.rank + direction === promotionRank) {
            // Promotion with capture
            ['queen', 'rook', 'bishop', 'knight'].forEach(promotionPiece => {
              moves.push({
                from,
                to: captureSquare,
                piece,
                captured: targetPiece,
                promotion: promotionPiece as any
              });
            });
          } else {
            moves.push({
              from,
              to: captureSquare,
              piece,
              captured: targetPiece
            });
          }
        }
        
        // En passant
        if (captureSquare === gameState.enPassantTarget) {
          const capturedPawnSquare = ChessBoard.coordinatesToSquare(fromCoords.file + fileOffset, fromCoords.rank);
          const capturedPawn = capturedPawnSquare ? position[capturedPawnSquare] : null;
          if (capturedPawn) {
            moves.push({
              from,
              to: captureSquare,
              piece,
              captured: capturedPawn,
              enPassant: true
            });
          }
        }
      }
    });

    return moves;
  }

  private static generateRookMoves(gameState: GameState, from: Square, piece: Piece): Move[] {
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    return this.generateSlidingMoves(gameState, from, piece, directions);
  }

  private static generateBishopMoves(gameState: GameState, from: Square, piece: Piece): Move[] {
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    return this.generateSlidingMoves(gameState, from, piece, directions);
  }

  private static generateQueenMoves(gameState: GameState, from: Square, piece: Piece): Move[] {
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    return this.generateSlidingMoves(gameState, from, piece, directions);
  }

  private static generateSlidingMoves(gameState: GameState, from: Square, piece: Piece, directions: number[][]): Move[] {
    const moves: Move[] = [];
    const { position } = gameState;
    const fromCoords = ChessBoard.squareToCoordinates(from);

    for (const [fileDir, rankDir] of directions) {
      for (let i = 1; i < 8; i++) {
        const toSquare = ChessBoard.coordinatesToSquare(
          fromCoords.file + i * fileDir,
          fromCoords.rank + i * rankDir
        );
        
        if (!toSquare) break;
        
        const targetPiece = position[toSquare];
        if (!targetPiece) {
          moves.push({ from, to: toSquare, piece });
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push({ from, to: toSquare, piece, captured: targetPiece });
          }
          break;
        }
      }
    }

    return moves;
  }

  private static generateKnightMoves(gameState: GameState, from: Square, piece: Piece): Move[] {
    const moves: Move[] = [];
    const { position } = gameState;
    const fromCoords = ChessBoard.squareToCoordinates(from);
    
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    for (const [fileOffset, rankOffset] of knightMoves) {
      const toSquare = ChessBoard.coordinatesToSquare(
        fromCoords.file + fileOffset,
        fromCoords.rank + rankOffset
      );
      
      if (toSquare) {
        const targetPiece = position[toSquare];
        if (!targetPiece) {
          moves.push({ from, to: toSquare, piece });
        } else if (targetPiece.color !== piece.color) {
          moves.push({ from, to: toSquare, piece, captured: targetPiece });
        }
      }
    }

    return moves;
  }

  private static generateKingMoves(gameState: GameState, from: Square, piece: Piece): Move[] {
    const moves: Move[] = [];
    const { position } = gameState;
    const fromCoords = ChessBoard.squareToCoordinates(from);
    
    const kingMoves = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [fileOffset, rankOffset] of kingMoves) {
      const toSquare = ChessBoard.coordinatesToSquare(
        fromCoords.file + fileOffset,
        fromCoords.rank + rankOffset
      );
      
      if (toSquare) {
        const targetPiece = position[toSquare];
        if (!targetPiece) {
          moves.push({ from, to: toSquare, piece });
        } else if (targetPiece.color !== piece.color) {
          moves.push({ from, to: toSquare, piece, captured: targetPiece });
        }
      }
    }

    // Castling
    moves.push(...this.generateCastlingMoves(gameState, from, piece));

    return moves;
  }

  private static generateCastlingMoves(gameState: GameState, from: Square, piece: Piece): Move[] {
    const moves: Move[] = [];
    const { position, castlingRights } = gameState;
    
    if (piece.color === 'white' && from === 'e1') {
      // White kingside castling
      if (castlingRights.whiteKingside && 
          !position['f1'] && !position['g1'] &&
          position['h1']?.type === 'rook' && position['h1']?.color === 'white') {
        moves.push({ from, to: 'g1', piece, castling: 'kingside' });
      }
      
      // White queenside castling
      if (castlingRights.whiteQueenside && 
          !position['d1'] && !position['c1'] && !position['b1'] &&
          position['a1']?.type === 'rook' && position['a1']?.color === 'white') {
        moves.push({ from, to: 'c1', piece, castling: 'queenside' });
      }
    } else if (piece.color === 'black' && from === 'e8') {
      // Black kingside castling
      if (castlingRights.blackKingside && 
          !position['f8'] && !position['g8'] &&
          position['h8']?.type === 'rook' && position['h8']?.color === 'black') {
        moves.push({ from, to: 'g8', piece, castling: 'kingside' });
      }
      
      // Black queenside castling
      if (castlingRights.blackQueenside && 
          !position['d8'] && !position['c8'] && !position['b8'] &&
          position['a8']?.type === 'rook' && position['a8']?.color === 'black') {
        moves.push({ from, to: 'c8', piece, castling: 'queenside' });
      }
    }

    return moves;
  }

  private static isLegalMove(gameState: GameState, move: Move): boolean {
    const newGameState = this.makeMove(gameState, move);
    return !this.isInCheck(newGameState, gameState.activeColor);
  }

  private static makeMove(gameState: GameState, move: Move): GameState {
    const newPosition = { ...gameState.position };
    const newGameState: GameState = {
      ...gameState,
      position: newPosition,
      activeColor: gameState.activeColor === 'white' ? 'black' : 'white'
    };

    // Make the move
    newPosition[move.to] = move.piece;
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

    if (move.promotion) {
      newPosition[move.to] = { type: move.promotion, color: move.piece.color };
    }

    return newGameState;
  }

  static isInCheck(gameState: GameState, color: PieceColor): boolean {
    const kingSquare = this.findKing(gameState.position, color);
    if (!kingSquare) return false;

    const opponentColor = color === 'white' ? 'black' : 'white';
    const opponentGameState = { ...gameState, activeColor: opponentColor };
    const opponentMoves = this.generatePseudoLegalMoves(opponentGameState);

    return opponentMoves.some(move => move.to === kingSquare);
  }

  private static findKing(position: any, color: PieceColor): Square | null {
    for (const [square, piece] of Object.entries(position)) {
      if (piece && (piece as Piece).type === 'king' && (piece as Piece).color === color) {
        return square as Square;
      }
    }
    return null;
  }
}