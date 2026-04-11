import { io, Socket } from 'socket.io-client';

const RELAY_URL = 'https://ponte-passaggi.onrender.com';
const MASTER_SECRET = 'Azzurro97_Master'; // Segreto per parlare con il Blackview

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    this.socket = io(RELAY_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Collegato al Relay Broker');
      this.socket?.emit('identify_master', MASTER_SECRET);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnesso dal Relay Broker');
    });
  }

  getSocket() {
    return this.socket;
  }

  // Esempio di richiesta preventivo al Blackview
  requestPrice(rideDetails: any) {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject('Socket non connesso');

      this.socket.emit('client_request', {
        action: 'GET_PRICE',
        payload: rideDetails
      });

      this.socket.on('master_response', (response: any) => {
        resolve(response);
      });
    });
  }
}

export const socketService = new SocketService();
