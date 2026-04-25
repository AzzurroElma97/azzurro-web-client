import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private readonly RELAY_URL = 'http://192.168.1.231:3000'; // Test Locale Titanium v3.0

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
        // Identificazione per ottenere lo stato iniziale
        this.socket?.emit('identify', {}, (res: any) => {
           if (res && res.success) {
              this.setMasterOnline(!!res.isServerOnline);
           }
        });
        this.checkMasterPresence();
      });

      this.socket.on('disconnect', () => {
        console.log('🔴 Disconnesso dal Relay');
        this.setMasterOnline(false);
      });

      this.socket.on('server_status', (data: { online: boolean }) => {
        this.setMasterOnline(data.online);
      });

      this.socket.on('master_ready_sync', () => {
        console.log('🔄 Master segnala rientro online. Sincronizzazione forzata.');
        this.setMasterOnline(true);
      });

      this.socket.on('forza_logout', (data: { userId?: number, type?: string, email?: string }) => {
        console.log('🚫 Ricevuta richiesta di Logout Forzato dal Master.');
        
        // Se non ci sono dati specifici, slogga tutti (es. reset admin globale)
        // Se ci sono dati, controlla se corrispondono all'utente attuale
        const isAdmin = localStorage.getItem('isAdminAuthenticated') === 'true';
        const customerData = JSON.parse(localStorage.getItem('customerData') || '{}');
        const driverData = JSON.parse(localStorage.getItem('driverData') || '{}');

        if (!data.userId || 
            (data.type === 'ADMIN' && isAdmin) || 
            (data.type === 'CUSTOMER' && customerData.id === data.userId) ||
            (data.type === 'DRIVER' && driverData.id === data.userId)) {
          
          this.performGlobalLogout();
        }
      });

      // Poll periodico se il relay non pusha (allineato alla nuova tolleranza di 90s)
      setInterval(() => this.checkMasterPresence(), 25000);
    }
  }

  private performGlobalLogout() {
    localStorage.removeItem('isAdminAuthenticated');
    localStorage.removeItem('isCustomerAuthenticated');
    localStorage.removeItem('isDriverAuthenticated');
    localStorage.removeItem('customerData');
    localStorage.removeItem('driverData');
    localStorage.removeItem('adminEmail');
    window.location.href = '/login';
  }

  private masterOnline: boolean = false; // Default false per riflettere lo stato reale al caricamento
  private statusListeners: ((status: boolean) => void)[] = [];

  private setMasterOnline(status: boolean) {
    if (this.masterOnline !== status) {
      this.masterOnline = status;
      this.statusListeners.forEach(cb => cb(status));
    }
  }

  public login(data: any, callback: (res: any) => void) {
    console.log("🔑 Inviando richiesta login al Master:", data.type, data.email || data.telefono);
    this.emit('client_request', { 
      action: 'LOGIN_USER', 
      ...data 
    }, (res) => {
      console.log("📩 Risposta Login dal Master:", res);
      callback(res);
    }, 30000);
  }

  public reportError(message: string, context: string = 'SITO', details?: any) {
    const payload = {
      action: 'SITE_ERROR_REPORT',
      errorMessage: message,
      errorContext: context,
      errorDetails: details ? JSON.stringify(details).substring(0, 500) : null,
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'N/A',
    };
    // Non-blocking: inviamo senza aspettare risposta
    this.emit('client_request', payload);
    console.warn(`📡 [TITANIUM] Errore segnalato al Blackview: [${context}] ${message}`);
  }

  private async checkMasterPresence() {
    this.emit('client_request', { action: 'PING' }, (res: any) => {
        // Se res.success è vero, il master è online o in grace period
        this.setMasterOnline(!!res?.success);
    }, 10000); // 10s timeout per il ping di controllo
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
        const expectedResponseAction = `${data.action}_RESPONSE`;

        // Timer di timeout
        const timer = setTimeout(() => {
          if (!called) {
            called = true;
            this.socket?.off('master_direct_response', handleDirectResponse);
            callback({ success: false, message: 'TIMEOUT', error: `Il Blackview non ha risposto entro ${timeoutMs/1000}s.` });
          }
        }, timeoutMs);

        // Canale PRIMARIO: ascolto evento diretto (funziona sempre anche senza ack RN)
        const handleDirectResponse = (res: any) => {
          if (res.action === expectedResponseAction && !called) {
            called = true;
            clearTimeout(timer);
            this.socket?.off('master_direct_response', handleDirectResponse);
            callback(res.payload ?? res);
          }
        };
        this.socket.on('master_direct_response', handleDirectResponse);

        // Canale SECONDARIO: ack socket.io standard (ignoriamo se è un oggetto vuoto da bug RN)
        this.socket.emit(event, data, (res: any) => {
          if (!called) {
            // Fix per il bug di React Native che restituisce {} nell'ACK
            const isEmptyObject = res && typeof res === 'object' && Object.keys(res).length === 0;
            if (!isEmptyObject) {
              called = true;
              clearTimeout(timer);
              this.socket?.off('master_direct_response', handleDirectResponse);
              callback(res);
            } else {
              console.warn("⚠️ Ignorata risposta ACK vuota dal Master. Attendo canale diretto...");
            }
          }
        });

      } else {
        // Fire-and-forget (nessuna callback)
        this.socket.emit(event, data, callback);
      }
    } else {
      console.warn('⚠️ Socket non inizializzato');
      if (callback) callback({ success: false, message: 'Connessione non disponibile.' });
    }
  }

  public getSocketId() {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
