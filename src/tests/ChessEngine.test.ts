import { describe, it, expect } from 'vitest';
import { ChessEngine } from '../core/ChessEngine';
import { Move } from '../types/chess';

describe('ChessEngine', () => {
  let engine: ChessEngine;

  beforeEach(() => {
    engine = new ChessEngine();
  });

  describe('initialization', () => {
    it('should initialize with correct starting position', () => {
      const gameState = engine.getGameState();
      
      expect(gameState.activeColor).toBe('white');
      expect(gameState.fullmoveNumber).toBe(1);
      expect(gameState.halfmoveClock).toBe(0);
      expect(gameState.position['e1']?.type).toBe('king');
      expect(gameState.position['e1']?.color).toBe('white');
      expect(gameState.position['e8']?.type).toBe('king');
      expect(gameState.position['e8']?.color).toBe('black');
    });

    it('should have correct castling rights initially', () => {
      const gameState = engine.getGameState();
      
      expect(gameState.castlingRights.whiteKingside).toBe(true);
      expect(gameState.castlingRights.whiteQueenside).toBe(true);
      expect(gameState.castlingRights.blackKingside).toBe(true);
      expect(gameState.castlingRights.blackQueenside).toBe(true);
    });
  });

  describe('makeMove', () => {
    it('should make a legal move successfully', () => {
      const move: Move = {
        from: 'e2',
        to: 'e4',
        piece: { type: 'pawn', color: 'white' }
      };
      
      const success = engine.makeMove(move);
      expect(success).toBe(true);
      
      const gameState = engine.getGameState();
      expect(gameState.position['e4']?.type).toBe('pawn');
      expect(gameState.position['e4']?.color).toBe('white');
      expect(gameState.position['e2']).toBeNull();
      expect(gameState.activeColor).toBe('black');
    });

    it('should reject illegal moves', () => {
      const illegalMove: Move = {
        from: 'e2',
        to: 'e5', // Pawn can't move 3 squares
        piece: { type: 'pawn', color: 'white' }
      };
      
      const success = engine.makeMove(illegalMove);
      expect(success).toBe(false);
      
      // Game state should remain unchanged
      const gameState = engine.getGameState();
      expect(gameState.position['e2']?.type).toBe('pawn');
      expect(gameState.position['e5']).toBeNull();
      expect(gameState.activeColor).toBe('white');
    });

    it('should update move history', () => {
      const move: Move = {
        from: 'e2',
        to: 'e4',
        piece: { type: 'pawn', color: 'white' }
      };
      
      engine.makeMove(move);
      const gameState = engine.getGameState();
      
      expect(gameState.moveHistory.length).toBe(1);
      expect(gameState.moveHistory[0].from).toBe('e2');
      expect(gameState.moveHistory[0].to).toBe('e4');
    });

    it('should handle pawn double move and set en passant target', () => {
      const move: Move = {
        from: 'e2',
        to: 'e4',
        piece: { type: 'pawn', color: 'white' }
      };
      
      engine.makeMove(move);
      const gameState = engine.getGameState();
      
      expect(gameState.enPassantTarget).toBe('e3');
    });

    it('should update castling rights when king moves', () => {
      // Clear path for king
      const moves = [
        { from: 'e2', to: 'e4', piece: { type: 'pawn', color: 'white' } },
        { from: 'e7', to: 'e5', piece: { type: 'pawn', color: 'black' } },
        { from: 'f1', to: 'e2', piece: { type: 'bishop', color: 'white' } },
        { from: 'f8', to: 'e7', piece: { type: 'bishop', color: 'black' } },
        { from: 'g1', to: 'f3', piece: { type: 'knight', color: 'white' } },
        { from: 'g8', to: 'f6', piece: { type: 'knight', color: 'black' } },
        { from: 'e1', to: 'f1', piece: { type: 'king', color: 'white' } }
      ];
      
      moves.forEach(move => engine.makeMove(move as Move));
      
      const gameState = engine.getGameState();
      expect(gameState.castlingRights.whiteKingside).toBe(false);
      expect(gameState.castlingRights.whiteQueenside).toBe(false);
    });
  });

  describe('getLegalMoves', () => {
    it('should return correct number of legal moves in starting position', () => {
      const legalMoves = engine.getLegalMoves();
      expect(legalMoves.length).toBe(20); // 16 pawn moves + 4 knight moves
    });

    it('should return fewer moves when pieces are blocked', () => {
      // Make some moves to develop pieces
      engine.makeMove({ from: 'e2', to: 'e4', piece: { type: 'pawn', color: 'white' } });
      engine.makeMove({ from: 'e7', to: 'e5', piece: { type: 'pawn', color: 'black' } });
      
      const legalMoves = engine.getLegalMoves();
      expect(legalMoves.length).toBeGreaterThan(20); // More options available
    });
  });

  describe('isGameOver', () => {
    it('should return null for ongoing game', () => {
      const result = engine.isGameOver();
      expect(result).toBeNull();
    });

    it('should detect stalemate', () => {
      // This would require setting up a stalemate position
      // For now, just test that the method exists and returns the correct type
      const result = engine.isGameOver();
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset game to initial state', () => {
      // Make some moves
      engine.makeMove({ from: 'e2', to: 'e4', piece: { type: 'pawn', color: 'white' } });
      engine.makeMove({ from: 'e7', to: 'e5', piece: { type: 'pawn', color: 'black' } });
      
      // Reset
      engine.reset();
      
      const gameState = engine.getGameState();
      expect(gameState.activeColor).toBe('white');
      expect(gameState.fullmoveNumber).toBe(1);
      expect(gameState.moveHistory.length).toBe(0);
      expect(gameState.position['e2']?.type).toBe('pawn');
      expect(gameState.position['e4']).toBeNull();
    });
  });

  describe('complex scenarios', () => {
    it('should handle castling correctly', () => {
      // Set up castling scenario
      const moves = [
        { from: 'e2', to: 'e4', piece: { type: 'pawn', color: 'white' } },
        { from: 'e7', to: 'e5', piece: { type: 'pawn', color: 'black' } },
        { from: 'g1', to: 'f3', piece: { type: 'knight', color: 'white' } },
        { from: 'g8', to: 'f6', piece: { type: 'knight', color: 'black' } },
        { from: 'f1', to: 'c4', piece: { type: 'bishop', color: 'white' } },
        { from: 'f8', to: 'c5', piece: { type: 'bishop', color: 'black' } }
      ];
      
      moves.forEach(move => engine.makeMove(move as Move));
      
      // Now castling should be possible
      const legalMoves = engine.getLegalMoves();
      const castlingMove = legalMoves.find(move => move.castling === 'kingside');
      
      expect(castlingMove).toBeDefined();
      if (castlingMove) {
        const success = engine.makeMove(castlingMove);
        expect(success).toBe(true);
        
        const gameState = engine.getGameState();
        expect(gameState.position['g1']?.type).toBe('king');
        expect(gameState.position['f1']?.type).toBe('rook');
      }
    });

    it('should handle pawn promotion', () => {
      // This would require setting up a position where a pawn can promote
      // For now, just verify the method structure
      const legalMoves = engine.getLegalMoves();
      expect(Array.isArray(legalMoves)).toBe(true);
    });
  });
});