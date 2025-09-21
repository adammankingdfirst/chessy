import { io, Socket } from 'socket.io-client';
import { NetworkMessage, Move, GameState } from '../types/chess';

export class SocketClient {
  private socket: Socket | null = null;
  private gameId: string | null = null;
  private playerId: string | null = null;
  private callbacks: Map<string, Function[]> = new Map();

  constructor(private serverUrl: string = 'http://localhost:3001') {
    this.initializeCallbacks();
  }

  private initializeCallbacks(): void {
    this.callbacks.set('move', []);
    this.callbacks.set('gameState', []);
    this.callbacks.set('playerJoined', []);
    this.callbacks.set('playerLeft', []);
    this.callbacks.set('gameEnd', []);
    this.callbacks.set('error', []);
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.setupEventHandlers();
        resolve(true);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection failed:', error);
        resolve(false);
      });
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('playerAssigned', (data: { playerId: string }) => {
      this.playerId = data.playerId;
    });

    this.socket.on('gameCreated', (data: { gameId: string }) => {
      this.gameId = data.gameId;
      this.emit('gameCreated', data);
    });

    this.socket.on('gameJoined', (data: { gameId: string, gameState: GameState }) => {
      this.gameId = data.gameId;
      this.emit('gameJoined', data);
    });

    this.socket.on('move', (data: { move: Move, gameState: GameState }) => {
      this.emit('move', data);
    });

    this.socket.on('gameState', (data: { gameState: GameState }) => {
      this.emit('gameState', data);
    });

    this.socket.on('playerJoined', (data: { playerId: string }) => {
      this.emit('playerJoined', data);
    });

    this.socket.on('playerLeft', (data: { playerId: string }) => {
      this.emit('playerLeft', data);
    });

    this.socket.on('gameEnd', (data: any) => {
      this.emit('gameEnd', data);
    });

    this.socket.on('error', (data: { message: string }) => {
      this.emit('error', data);
    });
  }

  createGame(): void {
    if (this.socket) {
      this.socket.emit('createGame');
    }
  }

  joinGame(gameId: string): void {
    if (this.socket) {
      this.socket.emit('joinGame', { gameId });
    }
  }

  sendMove(move: Move): void {
    if (this.socket && this.gameId) {
      this.socket.emit('move', {
        gameId: this.gameId,
        move,
        playerId: this.playerId
      });
    }
  }

  sendMessage(message: string): void {
    if (this.socket && this.gameId) {
      this.socket.emit('chat', {
        gameId: this.gameId,
        message,
        playerId: this.playerId
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.gameId = null;
      this.playerId = null;
    }
  }

  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  getGameId(): string | null {
    return this.gameId;
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}