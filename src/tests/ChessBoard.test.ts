import { describe, it, expect } from 'vitest';
import { ChessBoard } from '../core/ChessBoard';

describe('ChessBoard', () => {
  describe('createInitialPosition', () => {
    it('should create a valid initial chess position', () => {
      const position = ChessBoard.createInitialPosition();
      
      // Check white pieces
      expect(position['a1']?.type).toBe('rook');
      expect(position['a1']?.color).toBe('white');
      expect(position['e1']?.type).toBe('king');
      expect(position['e1']?.color).toBe('white');
      
      // Check black pieces
      expect(position['a8']?.type).toBe('rook');
      expect(position['a8']?.color).toBe('black');
      expect(position['e8']?.type).toBe('king');
      expect(position['e8']?.color).toBe('black');
      
      // Check pawns
      expect(position['a2']?.type).toBe('pawn');
      expect(position['a2']?.color).toBe('white');
      expect(position['a7']?.type).toBe('pawn');
      expect(position['a7']?.color).toBe('black');
      
      // Check empty squares
      expect(position['e4']).toBeNull();
      expect(position['d5']).toBeNull();
    });
  });

  describe('isValidSquare', () => {
    it('should validate correct squares', () => {
      expect(ChessBoard.isValidSquare('a1')).toBe(true);
      expect(ChessBoard.isValidSquare('h8')).toBe(true);
      expect(ChessBoard.isValidSquare('e4')).toBe(true);
    });

    it('should reject invalid squares', () => {
      expect(ChessBoard.isValidSquare('i1')).toBe(false);
      expect(ChessBoard.isValidSquare('a9')).toBe(false);
      expect(ChessBoard.isValidSquare('z5')).toBe(false);
      expect(ChessBoard.isValidSquare('e')).toBe(false);
      expect(ChessBoard.isValidSquare('44')).toBe(false);
    });
  });

  describe('getSquareColor', () => {
    it('should return correct square colors', () => {
      expect(ChessBoard.getSquareColor('a1')).toBe('dark');
      expect(ChessBoard.getSquareColor('a2')).toBe('light');
      expect(ChessBoard.getSquareColor('b1')).toBe('light');
      expect(ChessBoard.getSquareColor('h8')).toBe('light');
    });
  });

  describe('getDistance', () => {
    it('should calculate correct distances', () => {
      const distance = ChessBoard.getDistance('a1', 'h8');
      expect(distance.files).toBe(7);
      expect(distance.ranks).toBe(7);
      
      const distance2 = ChessBoard.getDistance('e4', 'e6');
      expect(distance2.files).toBe(0);
      expect(distance2.ranks).toBe(2);
    });
  });

  describe('getSquaresBetween', () => {
    it('should return squares between two squares on same rank', () => {
      const squares = ChessBoard.getSquaresBetween('a1', 'd1');
      expect(squares).toEqual(['b1', 'c1']);
    });

    it('should return squares between two squares on same file', () => {
      const squares = ChessBoard.getSquaresBetween('e2', 'e5');
      expect(squares).toEqual(['e3', 'e4']);
    });

    it('should return squares between two squares on diagonal', () => {
      const squares = ChessBoard.getSquaresBetween('a1', 'c3');
      expect(squares).toEqual(['b2']);
    });

    it('should return empty array for adjacent squares', () => {
      const squares = ChessBoard.getSquaresBetween('e4', 'e5');
      expect(squares).toEqual([]);
    });
  });

  describe('squareToCoordinates', () => {
    it('should convert squares to coordinates correctly', () => {
      expect(ChessBoard.squareToCoordinates('a1')).toEqual({ file: 0, rank: 0 });
      expect(ChessBoard.squareToCoordinates('h8')).toEqual({ file: 7, rank: 7 });
      expect(ChessBoard.squareToCoordinates('e4')).toEqual({ file: 4, rank: 3 });
    });
  });

  describe('coordinatesToSquare', () => {
    it('should convert coordinates to squares correctly', () => {
      expect(ChessBoard.coordinatesToSquare(0, 0)).toBe('a1');
      expect(ChessBoard.coordinatesToSquare(7, 7)).toBe('h8');
      expect(ChessBoard.coordinatesToSquare(4, 3)).toBe('e4');
    });

    it('should return null for invalid coordinates', () => {
      expect(ChessBoard.coordinatesToSquare(-1, 0)).toBeNull();
      expect(ChessBoard.coordinatesToSquare(8, 0)).toBeNull();
      expect(ChessBoard.coordinatesToSquare(0, -1)).toBeNull();
      expect(ChessBoard.coordinatesToSquare(0, 8)).toBeNull();
    });
  });
});