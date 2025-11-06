const REALTIME_SERVICE_URL = import.meta.env.VITE_REALTIME_SERVICE_URL || 'http://localhost:3007';

let socket: any = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

/**
 * WebSocket client for real-time updates
 * Handles connection, reconnection, and room management
 */

export interface RealtimeCallbacks {
  onOrderUpdate?: (data: any) => void;
  onTableUpdate?: (data: any) => void;
  onReservationUpdate?: (data: any) => void;
  onMenuUpdate?: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function connectRealtime(callbacks: RealtimeCallbacks, room?: string) {
  import('socket.io-client').then(({ io }) => {
    socket = io(REALTIME_SERVICE_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ Connected to real-time service');
      reconnectAttempts = 0;
      
      if (room) {
        socket.emit('join-room', room);
      }
      
      if (callbacks.onConnect) {
        callbacks.onConnect();
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from real-time service');
      if (callbacks.onDisconnect) {
        callbacks.onDisconnect();
      }
      
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
          socket.connect();
        }, 2000 * reconnectAttempts);
      }
    });

    socket.on('connect_error', (error: Error) => {
      console.error('❌ Connection error:', error);
      if (callbacks.onError) {
        callbacks.onError(error);
      }
    });

    socket.on('order-update', (data: any) => {
      if (callbacks.onOrderUpdate) {
        callbacks.onOrderUpdate(data);
      }
    });

    socket.on('table-update', (data: any) => {
      if (callbacks.onTableUpdate) {
        callbacks.onTableUpdate(data);
      }
    });

    socket.on('reservation-update', (data: any) => {
      if (callbacks.onReservationUpdate) {
        callbacks.onReservationUpdate(data);
      }
    });

    socket.on('menu-update', (data: any) => {
      if (callbacks.onMenuUpdate) {
        callbacks.onMenuUpdate(data);
      }
    });
  }).catch((error) => {
    console.error('❌ Failed to load socket.io-client:', error);
    if (callbacks.onError) {
      callbacks.onError(error);
    }
  });
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRoom(room: string) {
  if (socket) {
    socket.emit('join-room', room);
  }
}

export function leaveRoom(room: string) {
  if (socket) {
    socket.emit('leave-room', room);
  }
}



