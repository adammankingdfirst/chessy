import Peer, { DataConnection } from 'peerjs';
import { NetworkMessage, Move, GameState } from '../types/chess';

export class P2PClient {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private callbacks: Map<string, Function[]> = new Map();
  private isHost: boolean = false;

  constructor() {
    this.initializeCallbacks();
  }

  private initializeCallbacks(): void {
    this.callbacks.set('move', []);
    this.callbacks.set('gameState', []);
    this.callbacks.set('connected', []);
    this.callbacks.set('disconnected', []);
    this.callbacks.set('error', []);
  }

  async initialize(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log('Peer ID:', id);
        resolve(id);
      });

      this.peer.on('error', (error) => {
        console.error('Peer error:', error);
        reject(error);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });
    });
  }

  async hostGame(): Promise<string> {
    if (!this.peer) {
      throw new Error('Peer not initialized');
    }
    
    this.isHost = true;
    return this.peer.id;
  }

  async joinGame(hostId: string): Promise<void> {
    if (!this.peer) {
      throw new Error('Peer not initialized');
    }

    return new Promise((resolve, reject) => {
      this.connection = this.peer!.connect(hostId, {
        reliable: true
      });

      this.connection.on('open', () => {
        console.log('Connected to host');
        this.setupConnectionHandlers(this.connection!);
        this.emit('connected', { hostId });
        resolve();
      });

      this.connection.on('error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });
    });
  }

  private handleIncomingConnection(conn: DataConnection): void {
    this.connection = conn;
    
    conn.on('open', () => {
      console.log('Player connected');
      this.setupConnectionHandlers(conn);
      this.emit('connected', { peerId: conn.peer });
    });
  }

  private setupConnectionHandlers(conn: DataConnection): void {
    conn.on('data', (data: NetworkMessage) => {
      this.handleMessage(data);
    });

    conn.on('close', () => {
      console.log('Connection closed');
      this.emit('disconnected', {});
      this.connection = null;
    });

    conn.on('error', (error) => {
      console.error('Connection error:', error);
      this.emit('error', { error });
    });
  }

  private handleMessage(message: NetworkMessage): void {
    switch (message.type) {
      case 'move':
        this.emit('move', message.data);
        break;
      case 'gameState':
        this.emit('gameState', message.data);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  sendMove(move: Move): void {
    this.sendMessage({
      type: 'move',
      data: { move },
      timestamp: Date.now()
    });
  }

  sendGameState(gameState: GameState): void {
    this.sendMessage({
      type: 'gameState',
      data: { gameState },
      timestamp: Date.now()
    });
  }

  private sendMessage(message: NetworkMessage): void {
    if (this.connection && this.connection.open) {
      this.connection.send(message);
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
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

  isConnected(): boolean {
    return this.connection?.open || false;
  }

  isHosting(): boolean {
    return this.isHost;
  }

  getPeerId(): string | null {
    return this.peer?.id || null;
  }
}