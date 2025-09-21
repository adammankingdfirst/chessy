import { GameState, Move, PieceColor, AIConfig } from '../types/chess';
import { MoveGenerator } from '../core/MoveGenerator';
import { ChessEngine } from '../core/ChessEngine';

export class ChessAI {
  private config: AIConfig;
  private transpositionTable: Map<string, { score: number; depth: number; move?: Move }> = new Map();
  private killerMoves: Move[][] = [];
  private historyTable: Map<string, number> = new Map();

  constructor(config: AIConfig) {
    this.config = config;
    this.initializeKillerMoves();
  }

  private initializeKillerMoves(): void {
    for (let i = 0; i < 20; i++) {
      this.killerMoves[i] = [];
    }
  }

  async getBestMove(gameState: GameState): Promise<Move | null> {
    const startTime = Date.now();
    let bestMove: Move | null = null;
    let bestScore = -Infinity;

    // Iterative deepening
    for (let depth = 1; depth <= this.config.depth; depth++) {
      if (Date.now() - startTime > this.config.timeLimit) break;

      const result = this.minimax(gameState, depth, -Infinity, Infinity, true, 0);
      if (result.move) {
        bestMove = result.move;
        bestScore = result.score;
      }

      // If we found a mate, no need to search deeper
      if (Math.abs(bestScore) > 9000) break;
    }

    return bestMove;
  }

  private minimax(
    gameState: GameState, 
    depth: number, 
    alpha: number, 
    beta: number, 
    isMaximizing: boolean,
    ply: number
  ): { score: number; move?: Move } {
    const positionKey = this.getPositionKey(gameState);
    const ttEntry = this.transpositionTable.get(positionKey);
    
    if (ttEntry && ttEntry.depth >= depth) {
      return { score: ttEntry.score, move: ttEntry.move };
    }

    if (depth === 0) {
      return { score: this.quiescenceSearch(gameState, alpha, beta, isMaximizing, 0) };
    }

    const moves = this.orderMoves(MoveGenerator.generateLegalMoves(gameState), ply);
    
    if (moves.length === 0) {
      const isInCheck = MoveGenerator.isInCheck(gameState, gameState.activeColor);
      if (isInCheck) {
        return { score: isMaximizing ? -10000 + ply : 10000 - ply };
      } else {
        return { score: 0 }; // Stalemate
      }
    }

    let bestMove: Move | undefined;
    let bestScore = isMaximizing ? -Infinity : Infinity;

    for (const move of moves) {
      const newGameState = this.makeMove(gameState, move);
      const result = this.minimax(newGameState, depth - 1, alpha, beta, !isMaximizing, ply + 1);

      if (isMaximizing) {
        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (result.score < bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
        beta = Math.min(beta, bestScore);
      }

      if (beta <= alpha) {
        // Store killer move
        if (!move.captured && ply < this.killerMoves.length) {
          this.killerMoves[ply].unshift(move);
          this.killerMoves[ply] = this.killerMoves[ply].slice(0, 2);
        }
        break;
      }
    }

    // Store in transposition table
    this.transpositionTable.set(positionKey, {
      score: bestScore,
      depth,
      move: bestMove
    });

    return { score: bestScore, move: bestMove };
  }

  private quiescenceSearch(
    gameState: GameState,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    depth: number
  ): number {
    if (depth > 10) return this.evaluatePosition(gameState);

    const standPat = this.evaluatePosition(gameState);
    
    if (isMaximizing) {
      if (standPat >= beta) return beta;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return alpha;
      beta = Math.min(beta, standPat);
    }

    const captures = MoveGenerator.generateLegalMoves(gameState)
      .filter(move => move.captured)
      .sort((a, b) => this.getMVVLVA(b) - this.getMVVLVA(a));

    for (const move of captures) {
      const newGameState = this.makeMove(gameState, move);
      const score = this.quiescenceSearch(newGameState, alpha, beta, !isMaximizing, depth + 1);

      if (isMaximizing) {
        if (score >= beta) return beta;
        alpha = Math.max(alpha, score);
      } else {
        if (score <= alpha) return alpha;
        beta = Math.min(beta, score);
      }
    }

    return isMaximizing ? alpha : beta;
  }

  private orderMoves(moves: Move[], ply: number): Move[] {
    return moves.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Prioritize captures (MVV-LVA)
      if (a.captured) scoreA += this.getMVVLVA(a);
      if (b.captured) scoreB += this.getMVVLVA(b);

      // Prioritize promotions
      if (a.promotion) scoreA += 900;
      if (b.promotion) scoreB += 900;

      // Prioritize killer moves
      if (ply < this.killerMoves.length && this.killerMoves[ply].includes(a)) scoreA += 100;
      if (ply < this.killerMoves.length && this.killerMoves[ply].includes(b)) scoreB += 100;

      // History heuristic
      const historyA = this.historyTable.get(this.getMoveKey(a)) || 0;
      const historyB = this.historyTable.get(this.getMoveKey(b)) || 0;
      scoreA += historyA;
      scoreB += historyB;

      return scoreB - scoreA;
    });
  }

  private getMVVLVA(move: Move): number {
    if (!move.captured) return 0;
    
    const victimValue = this.getPieceValue(move.captured.type);
    const attackerValue = this.getPieceValue(move.piece.type);
    
    return victimValue * 10 - attackerValue;
  }

  private evaluatePosition(gameState: GameState): number {
    let score = 0;
    
    // Material evaluation
    score += this.evaluateMaterial(gameState);
    
    // Positional evaluation
    score += this.evaluatePosition_Positional(gameState);
    
    // King safety
    score += this.evaluateKingSafety(gameState);
    
    // Pawn structure
    score += this.evaluatePawnStructure(gameState);

    return gameState.activeColor === 'white' ? score : -score;
  }

  private evaluateMaterial(gameState: GameState): number {
    let score = 0;
    
    for (const piece of Object.values(gameState.position)) {
      if (piece) {
        const value = this.getPieceValue(piece.type);
        score += piece.color === 'white' ? value : -value;
      }
    }
    
    return score;
  }

  private evaluatePosition_Positional(gameState: GameState): number {
    let score = 0;
    
    const pieceSquareTables = this.getPieceSquareTables();
    
    for (const [square, piece] of Object.entries(gameState.position)) {
      if (piece) {
        const squareIndex = this.squareToIndex(square);
        const tableValue = pieceSquareTables[piece.type][squareIndex];
        score += piece.color === 'white' ? tableValue : -tableValue;
      }
    }
    
    return score;
  }

  private evaluateKingSafety(gameState: GameState): number {
    // Simplified king safety evaluation
    let score = 0;
    
    // Penalize exposed kings
    const whiteKingSquare = this.findKing(gameState.position, 'white');
    const blackKingSquare = this.findKing(gameState.position, 'black');
    
    if (whiteKingSquare) {
      score += this.getKingSafetyScore(gameState, whiteKingSquare, 'white');
    }
    
    if (blackKingSquare) {
      score -= this.getKingSafetyScore(gameState, blackKingSquare, 'black');
    }
    
    return score;
  }

  private evaluatePawnStructure(gameState: GameState): number {
    let score = 0;
    
    // Evaluate doubled, isolated, and passed pawns
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
    for (const file of files) {
      const whitePawns = [];
      const blackPawns = [];
      
      for (let rank = 1; rank <= 8; rank++) {
        const square = file + rank;
        const piece = gameState.position[square];
        if (piece?.type === 'pawn') {
          if (piece.color === 'white') {
            whitePawns.push(rank);
          } else {
            blackPawns.push(rank);
          }
        }
      }
      
      // Doubled pawns penalty
      if (whitePawns.length > 1) score -= 20 * (whitePawns.length - 1);
      if (blackPawns.length > 1) score += 20 * (blackPawns.length - 1);
      
      // Isolated pawns penalty
      const leftFile = files[files.indexOf(file) - 1];
      const rightFile = files[files.indexOf(file) + 1];
      
      if (whitePawns.length > 0) {
        const hasSupport = this.hasAdjacentPawns(gameState, leftFile, rightFile, 'white');
        if (!hasSupport) score -= 15;
      }
      
      if (blackPawns.length > 0) {
        const hasSupport = this.hasAdjacentPawns(gameState, leftFile, rightFile, 'black');
        if (!hasSupport) score += 15;
      }
    }
    
    return score;
  }

  private getPieceValue(pieceType: string): number {
    const values: { [key: string]: number } = {
      'pawn': 100,
      'knight': 320,
      'bishop': 330,
      'rook': 500,
      'queen': 900,
      'king': 20000
    };
    return values[pieceType] || 0;
  }

  private getPieceSquareTables(): { [key: string]: number[] } {
    // Simplified piece-square tables (from white's perspective)
    return {
      'pawn': [
        0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5,  5, 10, 25, 25, 10,  5,  5,
        0,  0,  0, 20, 20,  0,  0,  0,
        5, -5,-10,  0,  0,-10, -5,  5,
        5, 10, 10,-20,-20, 10, 10,  5,
        0,  0,  0,  0,  0,  0,  0,  0
      ],
      'knight': [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
      ],
      'bishop': [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
      ],
      'rook': [
        0,  0,  0,  0,  0,  0,  0,  0,
        5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        0,  0,  0,  5,  5,  0,  0,  0
      ],
      'queen': [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
        -5,  0,  5,  5,  5,  5,  0, -5,
        0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
      ],
      'king': [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
        20, 20,  0,  0,  0,  0, 20, 20,
        20, 30, 10,  0,  0, 10, 30, 20
      ]
    };
  }

  private squareToIndex(square: string): number {
    const file = square.charCodeAt(0) - 97; // 'a' = 0
    const rank = parseInt(square[1]) - 1;   // '1' = 0
    return rank * 8 + file;
  }

  private findKing(position: any, color: PieceColor): string | null {
    for (const [square, piece] of Object.entries(position)) {
      if (piece && (piece as any).type === 'king' && (piece as any).color === color) {
        return square;
      }
    }
    return null;
  }

  private getKingSafetyScore(gameState: GameState, kingSquare: string, color: PieceColor): number {
    // Simplified king safety evaluation
    let score = 0;
    
    // Penalize king in the center during opening/middlegame
    const file = kingSquare.charCodeAt(0) - 97;
    const rank = parseInt(kingSquare[1]) - 1;
    
    if (file >= 2 && file <= 5 && rank >= 2 && rank <= 5) {
      score -= 20;
    }
    
    return score;
  }

  private hasAdjacentPawns(gameState: GameState, leftFile: string | undefined, rightFile: string | undefined, color: PieceColor): boolean {
    if (!leftFile && !rightFile) return false;
    
    for (let rank = 1; rank <= 8; rank++) {
      if (leftFile) {
        const piece = gameState.position[leftFile + rank];
        if (piece?.type === 'pawn' && piece.color === color) return true;
      }
      if (rightFile) {
        const piece = gameState.position[rightFile + rank];
        if (piece?.type === 'pawn' && piece.color === color) return true;
      }
    }
    
    return false;
  }

  private makeMove(gameState: GameState, move: Move): GameState {
    const engine = new ChessEngine();
    // This is a simplified version - in practice, you'd want to optimize this
    const newPosition = { ...gameState.position };
    newPosition[move.to] = move.piece;
    newPosition[move.from] = null;
    
    return {
      ...gameState,
      position: newPosition,
      activeColor: gameState.activeColor === 'white' ? 'black' : 'white'
    };
  }

  private getPositionKey(gameState: GameState): string {
    // Create a unique key for the position
    let key = '';
    for (let rank = 8; rank >= 1; rank--) {
      for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        const square = file + rank;
        const piece = gameState.position[square];
        if (piece) {
          key += piece.color[0] + piece.type[0];
        } else {
          key += '-';
        }
      }
    }
    key += gameState.activeColor[0];
    return key;
  }

  private getMoveKey(move: Move): string {
    return `${move.from}-${move.to}-${move.piece.type}`;
  }

  setDifficulty(level: 'easy' | 'medium' | 'hard' | 'expert'): void {
    const configs = {
      easy: { depth: 2, timeLimit: 1000, useOpeningBook: false, useEndgameTablebase: false },
      medium: { depth: 4, timeLimit: 3000, useOpeningBook: true, useEndgameTablebase: false },
      hard: { depth: 6, timeLimit: 5000, useOpeningBook: true, useEndgameTablebase: true },
      expert: { depth: 8, timeLimit: 10000, useOpeningBook: true, useEndgameTablebase: true }
    };
    
    this.config = configs[level];
  }
}