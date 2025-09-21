import { GameState, Move, Square, Piece, GameMode } from '../types/chess';
import { ChessEngine } from '../core/ChessEngine';
import { ChessAI } from '../ai/ChessAI';
import { SocketClient } from '../network/SocketClient';
import { P2PClient } from '../network/P2PClient';

export class ChessUI {
  private engine: ChessEngine;
  private ai: ChessAI;
  private socketClient: SocketClient;
  private p2pClient: P2PClient;
  private gameMode: GameMode = 'pvp';
  private selectedSquare: Square | null = null;
  private legalMoves: Move[] = [];
  private isPlayerTurn: boolean = true;
  private playerColor: 'white' | 'black' = 'white';

  constructor(private container: HTMLElement) {
    this.engine = new ChessEngine();
    this.ai = new ChessAI({ depth: 4, timeLimit: 3000, useOpeningBook: true, useEndgameTablebase: false });
    this.socketClient = new SocketClient();
    this.p2pClient = new P2PClient();
    
    this.setupEventHandlers();
    this.render();
  }

  private setupEventHandlers(): void {
    // Socket events
    this.socketClient.on('move', (data: { move: Move, gameState: GameState }) => {
      this.engine.makeMove(data.move);
      this.updateUI();
      this.isPlayerTurn = true;
    });

    this.socketClient.on('gameJoined', (data: { gameId: string, gameState: GameState }) => {
      this.playerColor = 'black'; // Second player is black
      this.isPlayerTurn = false;
      this.updateUI();
    });

    // P2P events
    this.p2pClient.on('move', (data: { move: Move }) => {
      this.engine.makeMove(data.move);
      this.updateUI();
      this.isPlayerTurn = true;
    });

    this.p2pClient.on('connected', () => {
      this.updateUI();
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="chess-game">
        <div class="game-controls">
          <div class="mode-selector">
            <button class="mode-btn active" data-mode="pvp">Player vs Player</button>
            <button class="mode-btn" data-mode="pvc">Player vs Computer</button>
            <button class="mode-btn" data-mode="cvc">Computer vs Computer</button>
            <button class="mode-btn" data-mode="online">Online Game</button>
            <button class="mode-btn" data-mode="p2p">P2P Game</button>
          </div>
          
          <div class="ai-controls" style="display: none;">
            <label>AI Difficulty:</label>
            <select class="difficulty-select">
              <option value="easy">Easy</option>
              <option value="medium" selected>Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          
          <div class="network-controls" style="display: none;">
            <button class="create-game-btn">Create Game</button>
            <input type="text" class="game-id-input" placeholder="Enter Game ID">
            <button class="join-game-btn">Join Game</button>
          </div>
          
          <div class="p2p-controls" style="display: none;">
            <button class="host-game-btn">Host Game</button>
            <input type="text" class="peer-id-input" placeholder="Enter Peer ID">
            <button class="join-peer-btn">Join Peer</button>
            <div class="peer-info"></div>
          </div>
          
          <div class="game-actions">
            <button class="new-game-btn">New Game</button>
            <button class="undo-btn">Undo</button>
          </div>
        </div>
        
        <div class="game-board-container">
          <div class="game-info">
            <div class="current-player">Current Player: <span class="player-color">White</span></div>
            <div class="game-status"></div>
          </div>
          
          <div class="chess-board"></div>
          
          <div class="move-history">
            <h3>Move History</h3>
            <div class="moves-list"></div>
          </div>
        </div>
      </div>
    `;

    this.setupControlHandlers();
    this.renderBoard();
    this.updateUI();
  }

  private setupControlHandlers(): void {
    // Mode selection
    this.container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const mode = target.dataset.mode as GameMode;
        this.setGameMode(mode);
      });
    });

    // AI difficulty
    const difficultySelect = this.container.querySelector('.difficulty-select') as HTMLSelectElement;
    difficultySelect.addEventListener('change', (e) => {
      const difficulty = (e.target as HTMLSelectElement).value as 'easy' | 'medium' | 'hard' | 'expert';
      this.ai.setDifficulty(difficulty);
    });

    // Network controls
    this.container.querySelector('.create-game-btn')?.addEventListener('click', () => {
      this.createOnlineGame();
    });

    this.container.querySelector('.join-game-btn')?.addEventListener('click', () => {
      const gameId = (this.container.querySelector('.game-id-input') as HTMLInputElement).value;
      if (gameId) {
        this.joinOnlineGame(gameId);
      }
    });

    // P2P controls
    this.container.querySelector('.host-game-btn')?.addEventListener('click', () => {
      this.hostP2PGame();
    });

    this.container.querySelector('.join-peer-btn')?.addEventListener('click', () => {
      const peerId = (this.container.querySelector('.peer-id-input') as HTMLInputElement).value;
      if (peerId) {
        this.joinP2PGame(peerId);
      }
    });

    // Game actions
    this.container.querySelector('.new-game-btn')?.addEventListener('click', () => {
      this.newGame();
    });

    this.container.querySelector('.undo-btn')?.addEventListener('click', () => {
      this.undoMove();
    });
  }

  private renderBoard(): void {
    const boardElement = this.container.querySelector('.chess-board') as HTMLElement;
    boardElement.innerHTML = '';
    boardElement.className = 'chess-board';

    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const fileChar = String.fromCharCode(97 + file); // 'a' + file
        const square = fileChar + rank;
        const squareElement = document.createElement('div');
        
        squareElement.className = `square ${(file + rank) % 2 === 0 ? 'dark' : 'light'}`;
        squareElement.dataset.square = square;
        
        const piece = this.engine.getGameState().position[square];
        if (piece) {
          squareElement.innerHTML = this.getPieceSymbol(piece);
          squareElement.classList.add('has-piece');
        }

        squareElement.addEventListener('click', () => this.handleSquareClick(square));
        boardElement.appendChild(squareElement);
      }
    }
  }

  private getPieceSymbol(piece: Piece): string {
    const symbols: { [key: string]: { [key: string]: string } } = {
      white: {
        king: '♔', queen: '♕', rook: '♖',
        bishop: '♗', knight: '♘', pawn: '♙'
      },
      black: {
        king: '♚', queen: '♛', rook: '♜',
        bishop: '♝', knight: '♞', pawn: '♟'
      }
    };
    return symbols[piece.color][piece.type];
  }

  private handleSquareClick(square: Square): void {
    if (!this.isPlayerTurn) return;

    const gameState = this.engine.getGameState();
    const piece = gameState.position[square];

    if (this.selectedSquare) {
      if (this.selectedSquare === square) {
        // Deselect
        this.selectedSquare = null;
        this.clearHighlights();
      } else {
        // Try to make a move
        const move = this.legalMoves.find(m => m.from === this.selectedSquare && m.to === square);
        if (move) {
          this.makeMove(move);
        } else if (piece && piece.color === gameState.activeColor) {
          // Select new piece
          this.selectSquare(square);
        } else {
          // Invalid move
          this.selectedSquare = null;
          this.clearHighlights();
        }
      }
    } else if (piece && piece.color === gameState.activeColor) {
      // Select piece
      this.selectSquare(square);
    }
  }

  private selectSquare(square: Square): void {
    this.selectedSquare = square;
    this.legalMoves = this.engine.getLegalMoves().filter(move => move.from === square);
    this.highlightSquares();
  }

  private highlightSquares(): void {
    this.clearHighlights();
    
    if (this.selectedSquare) {
      const selectedElement = this.container.querySelector(`[data-square="${this.selectedSquare}"]`);
      selectedElement?.classList.add('selected');
      
      this.legalMoves.forEach(move => {
        const targetElement = this.container.querySelector(`[data-square="${move.to}"]`);
        targetElement?.classList.add('legal-move');
      });
    }
  }

  private clearHighlights(): void {
    this.container.querySelectorAll('.square').forEach(square => {
      square.classList.remove('selected', 'legal-move');
    });
  }

  private async makeMove(move: Move): Promise<void> {
    const success = this.engine.makeMove(move);
    if (!success) return;

    this.selectedSquare = null;
    this.clearHighlights();
    this.updateUI();

    // Send move to network if in multiplayer mode
    if (this.gameMode === 'online' && this.socketClient.isConnected()) {
      this.socketClient.sendMove(move);
      this.isPlayerTurn = false;
    } else if (this.gameMode === 'p2p' && this.p2pClient.isConnected()) {
      this.p2pClient.sendMove(move);
      this.isPlayerTurn = false;
    } else if (this.gameMode === 'pvc' || this.gameMode === 'cvc') {
      // AI move
      this.isPlayerTurn = false;
      setTimeout(async () => {
        const aiMove = await this.ai.getBestMove(this.engine.getGameState());
        if (aiMove) {
          this.engine.makeMove(aiMove);
          this.updateUI();
          
          if (this.gameMode === 'pvc') {
            this.isPlayerTurn = true;
          } else if (this.gameMode === 'cvc') {
            // Continue with another AI move
            setTimeout(() => this.makeMove(aiMove), 1000);
          }
        }
      }, 500);
    }

    // Check for game end
    const gameResult = this.engine.isGameOver();
    if (gameResult) {
      this.handleGameEnd(gameResult);
    }
  }

  private updateUI(): void {
    this.renderBoard();
    this.updateGameInfo();
    this.updateMoveHistory();
  }

  private updateGameInfo(): void {
    const gameState = this.engine.getGameState();
    const playerColorElement = this.container.querySelector('.player-color') as HTMLElement;
    const gameStatusElement = this.container.querySelector('.game-status') as HTMLElement;
    
    playerColorElement.textContent = gameState.activeColor.charAt(0).toUpperCase() + gameState.activeColor.slice(1);
    
    const gameResult = this.engine.isGameOver();
    if (gameResult) {
      if (gameResult.winner === 'draw') {
        gameStatusElement.textContent = `Game ended in a draw (${gameResult.reason})`;
      } else {
        gameStatusElement.textContent = `${gameResult.winner.charAt(0).toUpperCase() + gameResult.winner.slice(1)} wins by ${gameResult.reason}`;
      }
    } else {
      gameStatusElement.textContent = this.isPlayerTurn ? 'Your turn' : 'Waiting for opponent...';
    }
  }

  private updateMoveHistory(): void {
    const movesListElement = this.container.querySelector('.moves-list') as HTMLElement;
    const moveHistory = this.engine.getGameState().moveHistory;
    
    movesListElement.innerHTML = '';
    moveHistory.forEach((move, index) => {
      const moveElement = document.createElement('div');
      moveElement.className = 'move-item';
      moveElement.textContent = `${Math.floor(index / 2) + 1}${index % 2 === 0 ? '.' : '...'} ${this.moveToAlgebraic(move)}`;
      movesListElement.appendChild(moveElement);
    });
  }

  private moveToAlgebraic(move: Move): string {
    // Simplified algebraic notation
    let notation = '';
    
    if (move.castling) {
      return move.castling === 'kingside' ? 'O-O' : 'O-O-O';
    }
    
    if (move.piece.type !== 'pawn') {
      notation += move.piece.type.charAt(0).toUpperCase();
    }
    
    if (move.captured) {
      if (move.piece.type === 'pawn') {
        notation += move.from[0];
      }
      notation += 'x';
    }
    
    notation += move.to;
    
    if (move.promotion) {
      notation += '=' + move.promotion.charAt(0).toUpperCase();
    }
    
    return notation;
  }

  private setGameMode(mode: GameMode): void {
    this.gameMode = mode;
    
    // Update UI
    this.container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    this.container.querySelector(`[data-mode="${mode}"]`)?.classList.add('active');
    
    // Show/hide relevant controls
    this.container.querySelector('.ai-controls')!.style.display = 
      (mode === 'pvc' || mode === 'cvc') ? 'block' : 'none';
    this.container.querySelector('.network-controls')!.style.display = 
      mode === 'online' ? 'block' : 'none';
    this.container.querySelector('.p2p-controls')!.style.display = 
      mode === 'p2p' ? 'block' : 'none';
    
    this.newGame();
  }

  private async createOnlineGame(): Promise<void> {
    const connected = await this.socketClient.connect();
    if (connected) {
      this.socketClient.createGame();
      this.playerColor = 'white';
      this.isPlayerTurn = true;
    }
  }

  private async joinOnlineGame(gameId: string): Promise<void> {
    const connected = await this.socketClient.connect();
    if (connected) {
      this.socketClient.joinGame(gameId);
    }
  }

  private async hostP2PGame(): Promise<void> {
    try {
      const peerId = await this.p2pClient.initialize();
      const gameId = await this.p2pClient.hostGame();
      
      const peerInfoElement = this.container.querySelector('.peer-info') as HTMLElement;
      peerInfoElement.innerHTML = `<p>Your Peer ID: <strong>${peerId}</strong></p><p>Share this ID with your opponent</p>`;
      
      this.playerColor = 'white';
      this.isPlayerTurn = true;
    } catch (error) {
      console.error('Failed to host P2P game:', error);
    }
  }

  private async joinP2PGame(peerId: string): Promise<void> {
    try {
      await this.p2pClient.initialize();
      await this.p2pClient.joinGame(peerId);
      
      this.playerColor = 'black';
      this.isPlayerTurn = false;
    } catch (error) {
      console.error('Failed to join P2P game:', error);
    }
  }

  private newGame(): void {
    this.engine.reset();
    this.selectedSquare = null;
    this.legalMoves = [];
    this.isPlayerTurn = true;
    this.playerColor = 'white';
    this.updateUI();
    
    if (this.gameMode === 'cvc') {
      // Start computer vs computer game
      setTimeout(async () => {
        const aiMove = await this.ai.getBestMove(this.engine.getGameState());
        if (aiMove) {
          this.makeMove(aiMove);
        }
      }, 1000);
    }
  }

  private undoMove(): void {
    // This would require implementing move undo in the engine
    // For now, just reset the game
    this.newGame();
  }

  private handleGameEnd(result: any): void {
    this.isPlayerTurn = false;
    
    // Show game end dialog or notification
    const message = result.winner === 'draw' 
      ? `Game ended in a draw (${result.reason})`
      : `${result.winner.charAt(0).toUpperCase() + result.winner.slice(1)} wins by ${result.reason}`;
    
    setTimeout(() => {
      alert(message);
    }, 100);
  }
}