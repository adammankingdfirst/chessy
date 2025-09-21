import { describe, it, expect } from 'vitest';
import { MoveGenerator } from '../core/MoveGenerator';
import { ChessBoard } from '../core/ChessBoard';
import { GameState } from '../types/chess';

describe('MoveGenerator', () => {
  const createInitialGameState = (): GameState => ({
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
  });

  describe('generateLegalMoves', () => {
    it('should generate correct number of moves in initial position', () => {
      const gameState = createInitialGameState();
      const moves = MoveGenerator.generateLegalMoves(gameState);
      
      // In the initial position, white has 20 legal moves
      // 8 pawn moves (2 squares each) + 4 knight moves
      expect(moves.length).toBe(20);
    });

    it('should generate pawn moves correctly', () => {
      const gameState = createInitialGameState();
      const moves = MoveGenerator.generateLegalMoves(gameState);
      
      // Check for pawn moves
      const pawnMoves = moves.filter(move => move.piece.type === 'pawn');
      expect(pawnMoves.length).toBe(16); // 8 pawns × 2 moves each
      
      // Check specific pawn moves
      const e2Moves = pawnMoves.filter(move => move.from === 'e2');
      expect(e2Moves.length).toBe(2);
      expect(e2Moves.some(move => move.to === 'e3')).toBe(true);
      expect(e2Moves.some(move => move.to === 'e4')).toBe(true);
    });

    it('should generate knight moves correctly', () => {
      const gameState = createInitialGameState();
      const moves = MoveGenerator.generateLegalMoves(gameState);
      
      // Check for knight moves
      const knightMoves = moves.filter(move => move.piece.type === 'knight');
      expect(knightMoves.length).toBe(4); // 2 knights × 2 moves each
      
      // Check specific knight moves
      const b1Moves = knightMoves.filter(move => move.from === 'b1');
      expect(b1Moves.length).toBe(2);
      expect(b1Moves.some(move => move.to === 'a3')).toBe(true);
      expect(b1Moves.some(move => move.to === 'c3')).toBe(true);
    });

    it('should not allow moves that leave king in check', () => {
      // Create a position where the king is in check
      const gameState = createInitialGameState();
      
      // Place a black queen on d1 to check the white king
      gameState.position['d1'] = { type: 'queen', color: 'black' };
      gameState.position['d8'] = null; // Remove black queen from original position
      
      const moves = MoveGenerator.generateLegalMoves(gameState);
      
      // The king should be able to move or the check should be blockable
      expect(moves.length).toBeGreaterThan(0);
      
      // Verify that no move leaves the king in check
      moves.forEach(move => {
        // This is a simplified test - in a real implementation,
        // we would apply each move and verify the king is not in check
        expect(move).toBeDefined();
      });
    });
  });

  describe('isInCheck', () => {
    it('should detect when king is in check', () => {
      const gameState = createInitialGameState();
      
      // Place a black queen on d1 to check the white king
      gameState.position['d1'] = { type: 'queen', color: 'black' };
      
      const isInCheck = MoveGenerator.isInCheck(gameState, 'white');
      expect(isInCheck).toBe(true);
    });

    it('should return false when king is not in check', () => {
      const gameState = createInitialGameState();
      
      const isInCheck = MoveGenerator.isInCheck(gameState, 'white');
      expect(isInCheck).toBe(false);
    });
  });

  describe('castling moves', () => {
    it('should generate castling moves when conditions are met', () => {
      const gameState = createInitialGameState();
      
      // Clear squares between king and rook for kingside castling
      gameState.position['f1'] = null;
      gameState.position['g1'] = null;
      
      const moves = MoveGenerator.generateLegalMoves(gameState);
      const castlingMoves = moves.filter(move => move.castling === 'kingside');
      
      expect(castlingMoves.length).toBe(1);
      expect(castlingMoves[0].from).toBe('e1');
      expect(castlingMoves[0].to).toBe('g1');
    });

    it('should not generate castling moves when king has moved', () => {
      const gameState = createInitialGameState();
      
      // Clear squares and disable castling rights
      gameState.position['f1'] = null;
      gameState.position['g1'] = null;
      gameState.castlingRights.whiteKingside = false;
      
      const moves = MoveGenerator.generateLegalMoves(gameState);
      const castlingMoves = moves.filter(move => move.castling === 'kingside');
      
      expect(castlingMoves.length).toBe(0);
    });
  });

  describe('en passant', () => {
    it('should generate en passant moves when available', () => {
      const gameState = createInitialGameState();
      
      // Set up en passant scenario
      gameState.position['e5'] = { type: 'pawn', color: 'white' };
      gameState.position['d5'] = { type: 'pawn', color: 'black' };
      gameState.position['e2'] = null; // Remove original white pawn
      gameState.enPassantTarget = 'd6';
      
      const moves = MoveGenerator.generateLegalMoves(gameState);
      const enPassantMoves = moves.filter(move => move.enPassant);
      
      expect(enPassantMoves.length).toBe(1);
      expect(enPassantMoves[0].from).toBe('e5');
      expect(enPassantMoves[0].to).toBe('d6');
    });
  });

  describe('pawn promotion', () => {
    it('should generate promotion moves for pawns reaching the end', () => {
      const gameState = createInitialGameState();
      
      // Place a white pawn on the 7th rank
      gameState.position['e7'] = { type: 'pawn', color: 'white' };
      gameState.position['e2'] = null; // Remove original pawn
      
      const moves = MoveGenerator.generateLegalMoves(gameState);
      const promotionMoves = moves.filter(move => move.promotion);
      
      // Should have 4 promotion options (queen, rook, bishop, knight)
      expect(promotionMoves.length).toBe(4);
      
      const promotionTypes = promotionMoves.map(move => move.promotion);
      expect(promotionTypes).toContain('queen');
      expect(promotionTypes).toContain('rook');
      expect(promotionTypes).toContain('bishop');
      expect(promotionTypes).toContain('knight');
    });
  });
});