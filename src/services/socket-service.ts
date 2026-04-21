import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private readonly RELAY_URL = 'https://azzurro-relay-broker.onrender.com'; // Live Ponte v2.0

  constructor() {
    if (typeof window !== 'undefined') {
      this.socket = io(this.RELAY_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('📡 Connesso al Relay Broker Titanium');
        this.checkMasterPresence();
      });

      this.socket.on('disconnect', () => {
        console.log('🔴 Disconnesso dal Relay');
        this.setMasterOnline(false);
      });

      this.socket.on('server_status', (data: { online: boolean }) => {
        this.setMasterOnline(data.online);
      });

      // Poll periodico se il relay non pusha
      setInterval(() => this.checkMasterPresence(), 30000);
    }
  }

  private masterOnline: boolean = false; // Default false per riflettere lo stato reale al caricamento
  private statusListeners: ((status: boolean) => void)[] = [];

  private setMasterOnline(status: boolean) {
    if (this.masterOnline !== status) {
      this.masterOnline = status;
      this.statusListeners.forEach(cb => cb(status));
    }
  }

  private async checkMasterPresence() {
    this.emit('client_request', { action: 'PING' }, (res: any) => {
        this.setMasterOnline(!!res?.success);
    }, 5000); // 5s timeout per il ping
  }

  public subscribeStatus(callback: (status: boolean) => void) {
    this.statusListeners.push(callback);
    callback(this.masterOnline);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  public isMasterOnline() {
    return this.masterOnline;
  }

  public on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  public once(event: string, callback: (data: any) => void) {
    this.socket?.once(event, callback);
  }

  public off(event: string) {
    this.socket?.off(event);
  }

  public emit(event: string, data: any, callback?: (res: any) => void, timeoutMs: number = 0) {
    if (this.socket) {
      if (timeoutMs > 0 && callback) {
        let called = false;
        const timer = setTimeout(() => {
          if (!called) {
            called = true;
            callback({ success: false, message: 'TIMEOUT_EXCEEDED', error: `Il server Master non ha risposto entro ${timeoutMs/1000}s.` });
          }
        }, timeoutMs);

        this.socket.emit(event, data, (res: any) => {
          if (!called) {
            called = true;
            clearTimeout(timer);
            callback(res);
          }
        });
      } else {
        this.socket.emit(event, data, callback);
      }
    } else {
      console.warn('⚠️ Socket non inizializzato');
    }
  }

  public getSocketId() {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
